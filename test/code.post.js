// Auto generated code
import { useOnce } from "./use-once-function.js";
let count = 0;
const increment = useOnce(() => {
  return ++count;
});
console.log(increment());
console.log(increment());
console.log(increment());
console.log(increment());