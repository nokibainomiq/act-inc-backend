declare module 'mongo-sanitize' {
  function sanitize<T>(value: T): T;
  export = sanitize;
}
