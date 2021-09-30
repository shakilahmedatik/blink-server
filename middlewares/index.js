import expressJwt from 'express-jwt'

//Extract token from cookie and check user id.
export const requireSignin = expressJwt({
  getToken: (req, res) => req.cookies.token,
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
})
