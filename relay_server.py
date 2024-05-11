import socketio
import sys
import os
from datetime import timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
from libs.gcode_segment import GcodeSegment
from libs.svg import svg_line_write

debug = True

static_files = {
    '': './client',
}

sio = socketio.Server(cors_allowed_origins='*')

class RelayNamespace(socketio.Namespace):
  gcode_vis_client = '00'
  cache = {}

  def get_parse_gcode(self, filename):
    if 'p' in self.cache and 'v' in self.cache and 't' in self.cache and 'fline' in self.cache:
      return self.cache['p'], self.cache['v'], self.cache['t'], self.cache['fline']
    p, v, t, fline = GcodeSegment.parse_gcode(filename, return_file_line=True)
    self.cache = {'p': p, 'v': v, 't': t, 'fline': fline}
    return p, v, t, fline

  def on_connect(self, namespace, sid, environ, auth):
    self.cache = {}
    print(f'Connected: {namespace} {sid}')

  def on_disconnect(self, namespace, sid):
    print(f'Disconnected: {namespace} {sid}')
    if sid == self.gcode_vis_client:
      self.gcode_vis_client = ''

  def on_register(self, namespace, sid, data):
    print(f'Register: {namespace} {sid} {data}')
    self.gcode_vis_client = sid
    # if debug:
    #   for i in range(10):
    #     self.emit('gcode', 'G0 X0 F1000\nG0 Y0 F1000\nG0 Z0 F1000\n', namespace=namespace, to=sid)
    #   self.emit('gcode_finished', '', namespace=namespace, to=sid)

  def on_gcode_visualize(self, namespace, sid, filename):
    print(f'Gcode visualize: {filename}')
    self.send('ok', namespace=namespace, to=sid)
    if isinstance(filename, str) and len(self.gcode_vis_client) > 0:
      if os.path.exists(filename):
        # Send file content
        with open(filename, 'r') as f:
          for line in f:
            self.emit('gcode', line, namespace=namespace, to=self.gcode_vis_client)
        self.emit('gcode_finished', '', namespace=namespace, to=self.gcode_vis_client)
        
        # Parse positions and send to client
        p, _, _, fline = self.get_parse_gcode(filename)
        p = [p.tolist() for p in p]
        self.emit('gcode_pos', p, namespace=namespace, to=self.gcode_vis_client)
        self.emit('gcode_fline', fline, namespace=namespace, to=self.gcode_vis_client)
    

  def on_gcode_border(self, namespace, sid, filename):
    print(f'Gcode border: {filename}')
    if isinstance(filename, str):
      p, _, _, t = self.get_parse_gcode(filename)
      p = np.array(p)
  
      duration = timedelta(seconds=sum(t)*60)
      duration_str = str(duration).split(':')

      pmin = np.min(p, axis=0)
      pmax = np.max(p, axis=0)
      xmin, xmax = pmin[0], pmax[0]
      ymin, ymax = pmin[1], pmax[1]

      width = xmax - xmin
      height = ymax - ymin  

      first, suffix = os.path.splitext(filename)
      border_filename = first + '_border' + suffix
  
      with open(border_filename, 'w') as f:
        f.write(f'; Generated boundary from: {filename}\n')
        f.write(f'; xmin: {xmin}\n; xmax: {xmax}\n; ymin: {ymin}\n; ymax: {ymax}\n')
        f.write(f'; W: {width}\n; H: {height} [mm]\n')
        f.write(f'; estimated printing duration: {duration_str[0]}h {duration_str[1]}m {float(duration_str[2]):.2f}s\n\n')
        f.write('G91\n')
        f.write(f'G0 X{xmin} Y{ymin} F200\n')
        for i in range(1):
          f.write(f'G0 X{width} F200\n')
          f.write(f'G0 Y{height} F200\n')
          f.write(f'G0 X{-width} F200\n')
          f.write(f'G0 Y{-height} F200\n')
        f.write(f'G0 X{-xmin} Y{-ymin} F200\n')
    self.send('ok', namespace=namespace, to=sid)

  def on_export_svg(self, namespace, sid, filename):
    print(f'Export svg: {filename}')
    if isinstance(filename, str):
      p, _, _, _ = self.get_parse_gcode(filename)
      # create and format svg filenames
      _base, _ = os.path.splitext(filename)
      svg_filename = _base + '.svg'
      svg_line_write(p, filename=svg_filename, stroke_width=0.01)
    self.send('ok', namespace=namespace, to=sid)

  def on_relay(self, namespace, sid, data):
    if isinstance(data, dict) and len(self.gcode_vis_client) > 0:
      event = data['event'] if 'event' in data else 'gcode'
      cdata = data['data'] if 'data' in data else ''
      self.emit(event, cdata, namespace=namespace, to=self.gcode_vis_client)

sio.register_namespace(RelayNamespace('*'))

app = socketio.WSGIApp(sio, static_files=static_files)
from gevent import pywsgi
print('Server running on http://localhost:8000')
pywsgi.WSGIServer(('', 8000), app, log=None).serve_forever()