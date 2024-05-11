import socketio
from time import sleep
import os

url = "http://localhost:8000/"

current_dir = os.path.dirname(os.path.abspath(__file__))
filename = os.path.join(current_dir, 'test.gcode')

with socketio.SimpleClient() as sio:
  sio.connect(url, transports=['websocket'])
  print(sio.sid)
  sio.emit('gcode_visualize', filename)
  #sio.emit('relay', {'event': 'gcode_finished'})
  s = sio.receive(timeout=3)
print('Done')