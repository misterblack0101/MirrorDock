/**
 * Message types for communication between extension and WebView
 */

// Messages sent from Extension to WebView
export interface FrameMessage {
  type: 'frame';
  data: number[]; // H.264 frame data as number array (will be converted to Uint8Array in WebView)
}

export interface StatusMessage {
  type: 'status';
  status: 'starting' | 'running' | 'stopped' | 'error';
  message?: string;
}

export interface DeviceInfoMessage {
  type: 'deviceInfo';
  width: number;
  height: number;
}

export type ExtensionMessage = FrameMessage | StatusMessage | DeviceInfoMessage;

// Messages sent from WebView to Extension
export interface TapInputMessage {
  type: 'input';
  action: 'tap';
  payload: {
    x: number;
    y: number;
  };
}

export interface SwipeInputMessage {
  type: 'input';
  action: 'swipe';
  payload: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    duration: number;
  };
}

export interface LongPressInputMessage {
  type: 'input';
  action: 'longPress';
  payload: {
    x: number;
    y: number;
    duration: number;
  };
}

export interface DragInputMessage {
  type: 'input';
  action: 'drag';
  payload: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    duration: number;
  };
}

export interface StartMessage {
  type: 'start';
}

export interface StopMessage {
  type: 'stop';
}

export type WebViewMessage =
  | TapInputMessage
  | SwipeInputMessage
  | LongPressInputMessage
  | DragInputMessage
  | StartMessage
  | StopMessage;
