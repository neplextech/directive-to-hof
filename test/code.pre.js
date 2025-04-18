let count = 0;

function increment() {
    'use once';
    return ++count;
}

console.log(increment())
console.log(increment())
console.log(increment())
console.log(increment())