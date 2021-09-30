import User from '../models/user'
import { hashPassword, comparePassword } from '../utils/auth'
import { sendEmail } from '../utils/mail'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'

//User Registration
export const register = async (req, res) => {
  try {
    //Received Data From Front-End
    const { name, email, password } = req.body

    // Name validation
    if (!name) return res.status(400).send('Name is required')

    // Password validation
    if (!password || password.length < 6) {
      return res
        .status(400)
        .send('Password is required and should be min 6 characters long')
    }

    // Email validation
    let userExist = await User.findOne({ email }).exec()
    if (userExist) return res.status(400).send('Email is taken')

    // hash password
    const hashedPassword = await hashPassword(password)

    // Save user in database
    const user = new User({
      name,
      email,
      password: hashedPassword,
    })
    await user.save()

    //Send success response to front-end
    return res.json({ ok: true })
  } catch (err) {
    console.log(err)
    return res.status(400).send('Error. Try again.')
  }
}

//User Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Email Validation
    const user = await User.findOne({ email }).exec()
    if (!user) return res.status(400).send('No user found')

    // Password Validation
    const match = await comparePassword(password, user.password)
    if (!match) return res.status(400).send("Password didn't match.")

    // Create Signed JWT
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    // Return User & Token to client, exclude hashed password.
    user.password = undefined

    // Send token in cookie.
    res.cookie('token', token, {
      // httpOnly: true,
      secure: true, // only works on https
    })

    // Send user as json response
    res.json(user)
  } catch (err) {
    console.log(err)
    return res.status(400).send('Error. Try again.')
  }
}

//User Logout
export const logout = async (req, res) => {
  try {
    res.clearCookie('token')
    return res.json({ message: 'Signout success' })
  } catch (err) {
    console.log(err)
  }
}

//Check Current User
export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').exec()
    console.log('CURRENT_USER', user)
    return res.json({ ok: true })
  } catch (err) {
    console.log(err)
  }
}

//Send Reset Code to Email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    const shortCode = nanoid(6).toUpperCase()
    const user = await User.findOneAndUpdate(
      { email },
      { passwordResetCode: shortCode }
    )
    if (!user) return res.status(400).send('User not found')

    // Send reset code to users email
    const resetEmail = await sendEmail(email, shortCode)

    // Send success response to front-end
    res.json({ ok: true })
  } catch (err) {
    console.log(err)
  }
}

//Password Reset
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body

    // Password validation & hashing
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .send('Password is required and should be min 6 characters long')
    }
    const hashedPassword = await hashPassword(newPassword)

    //Compare code & update password
    const user = await User.findOneAndUpdate(
      {
        passwordResetCode: code,
      },
      {
        password: hashedPassword,
        passwordResetCode: '',
      }
    ).exec()
    if (!user) return res.status(400).send('Wrong code! Try again.')

    res.json({ ok: true })
  } catch (err) {
    console.log(err)
    return res.status(400).send('Error! Try again.')
  }
}
