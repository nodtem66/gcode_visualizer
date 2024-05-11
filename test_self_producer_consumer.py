import socketio
from time import sleep

url = "http://localhost:8000/"
another_client = socketio.Client()
another_client.connect(url, transports=['websocket'])
another_client.on('gcode', lambda data: print(f'Another client received: {data}'))
another_sid = another_client.get_sid()

with socketio.SimpleClient() as sio:
  sio.connect(url, transports=['websocket'])
  print(sio.sid)
  sio.emit('gcode', 123)
  sio.emit('gcode', '123')
  for i in range(100):
    sio.emit('gcode', {'target': another_sid, 'data': 'G0 X0 Y0 Z0 F1000'})
  sleep(1)
another_client.disconnect()