const createContextHook = (useHook) => {
  const Context = {
    Provider: ({ children }) => children,
    _currentValue: null,
  };

  const useContext = () => {
    return useHook();
  };

  return [Context.Provider, useContext];
};

module.exports = createContextHook;
