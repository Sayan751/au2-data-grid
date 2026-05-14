declare module '*.html' {
  const value: string;
  export default value;
}

declare module '*.css' {
  const styles: Record<string, string>;
  export = styles;
}