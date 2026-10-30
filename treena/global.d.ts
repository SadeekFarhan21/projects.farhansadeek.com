declare module 'react-native-syntax-highlighter';
declare module 'react-syntax-highlighter/styles/hljs';
declare module 'react-syntax-highlighter/dist/cjs/styles/hljs';
declare module 'lowlight' {
  const lowlight: {
    highlight: (language: string, code: string) => { value: any[] };
    highlightAuto: (code: string) => { value: any[]; language: string };
  };
  export default lowlight;
}
