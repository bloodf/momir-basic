const globalState = global.__MMKV_MOCK_STATE__ ?? {
  instances: new Map(),
};

global.__MMKV_MOCK_STATE__ = globalState;

function createStore() {
  const values = new Map();

  return {
    getString: jest.fn((key) => values.get(key)),
    set: jest.fn((key, value) => {
      values.set(key, value);
    }),
    remove: jest.fn((key) => {
      values.delete(key);
      return true;
    }),
    contains: jest.fn((key) => values.has(key)),
    clearAll: jest.fn(() => {
      values.clear();
    }),
    getAllKeys: jest.fn(() => Array.from(values.keys())),
  };
}

const createMMKV = jest.fn((config = {}) => {
  const id = config.id ?? 'mmkv.default';
  if (!globalState.instances.has(id)) {
    globalState.instances.set(id, createStore());
  }
  return globalState.instances.get(id);
});

function __resetMMKVMock() {
  globalState.instances.clear();
  createMMKV.mockClear();
}

module.exports = {
  createMMKV,
  __resetMMKVMock,
};
