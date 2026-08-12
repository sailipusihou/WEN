declare module 'nodemailer' {
  function createTransport(config: any): any
  export { createTransport }
  const nodemailer: { createTransport: typeof createTransport }
  export default nodemailer
}
