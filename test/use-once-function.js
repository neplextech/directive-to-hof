export function useOnce(fn) {
  let result;

  return (...args) => {
    if (result !== undefined) return result;
    return (result = fn(...args));
  };
}