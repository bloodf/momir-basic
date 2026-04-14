let listener = null;
let currentState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
};

const unsubscribe = jest.fn();

const NetInfo = {
  addEventListener: jest.fn((callback) => {
    listener = callback;
    return unsubscribe;
  }),
  fetch: jest.fn(async () => currentState),
  __setState(nextState) {
    currentState = { ...currentState, ...nextState };
  },
  __emit(nextState) {
    currentState = { ...currentState, ...nextState };
    if (listener) {
      listener(currentState);
    }
  },
  __reset() {
    listener = null;
    currentState = {
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
    };
    unsubscribe.mockClear();
    NetInfo.addEventListener.mockClear();
    NetInfo.fetch.mockClear();
  },
};

module.exports = NetInfo;
module.exports.default = NetInfo;
