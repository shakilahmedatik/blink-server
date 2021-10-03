import nodemailer from 'nodemailer'

export const sendEmail = async (userEmail, shortCode) => {
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_ID, // Email Address(Gmail)
      pass: process.env.PASSWORD, // Password(App Password)
    },
  })

  // send mail with defined transport object
  let info = await transporter
    .sendMail({
      from: '"Blink LTD" <support@blink.com>', // sender address
      to: userEmail, // list of receivers or a single receiver
      subject: 'Password Reset Request | Blink', // Subject line
      html: `
      <h1>Reset password</h1>
      <p>Use this code to reset your password</p>
      <h2 style="color:red;">${shortCode}</h2>
      <i>blink.com</i>`, // html body
    })
    .catch(error => {
      console.log(error)
    })

  console.log('Message sent: ', info.messageId)
}
