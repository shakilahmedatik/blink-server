import Course from '../models/course'
import User from '../models/user'
import Completed from '../models/completed'
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import queryString from 'query-string'
const fs = require('fs')
const imgbbUploader = require('imgbb-uploader')
const cloudinary = require('cloudinary').v2
const stripe = require('stripe')(process.env.STRIPE_SECRET)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Upload Course Image
export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body
    if (!image) return res.status(400).send('No image')

    // Upload image in imgbb
    const options = {
      apiKey: process.env.IMGBB_API_KEY,
      base64string: image,
      name: nanoid(5),
    }
    imgbbUploader(options)
      .then(response => {
        res.json({
          display_url: response.display_url,
          delete_url: response.delete_url,
        })
      })
      .catch(error => console.error(error))
  } catch (err) {
    console.log(err)
  }
}

// Create Course
export const create = async (req, res) => {
  try {
    const alreadyExist = await Course.findOne({
      slug: slugify(req.body.name.toLowerCase()),
    })
    if (alreadyExist)
      return res.status(400).send('Title is taken, use another title.')

    const course = await new Course({
      slug: slugify(req.body.name),
      instructor: req.user._id,
      ...req.body,
    }).save()

    res.json(course)
  } catch (err) {
    console.log(err)
    return res.status(400).send('Course create failed. Try again.')
  }
}

export const read = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate('instructor', '_id name')
      .exec()
    res.json(course)
  } catch (err) {
    console.log(err)
  }
}

export const uploadVideo = async (req, res) => {
  try {
    // Only instructor can upload video
    if (req.user._id != req.params.instructorId) {
      return res.status(400).send('Unauthorized')
    }
    const { video } = req.files

    if (!video) return res.status(400).send('No video')

    // Start uploading
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'video', encoding: 'binary' },
      function (error, result) {
        if (error) {
          console.log(error)
          res.sendStatus(400)
        }
        res.send(result)
      }
    )
    fs.createReadStream(video.path).pipe(stream)
  } catch (err) {
    console.log(err)
  }
}

export const removeVideo = async (req, res) => {
  try {
    const { courseId } = req.params
    // find post
    const courseFound = await Course.findById(courseId)
      .select('instructor')
      .exec()
    // is owner?
    if (req.user._id != courseFound.instructor._id) {
      return res.status(400).send('Unauthorized')
    }

    const { public_id } = req.body

    // Delete video from cloudinary
    cloudinary.uploader.destroy(
      public_id,
      { resource_type: 'video' },
      function (error, result) {
        if (error) {
          console.log(error)
          return res.sendStatus(400)
        }
        return res.send({ ok: true })
      }
    )
  } catch (err) {
    console.log(err)
  }
}

// Add new lesson in a course
export const addLesson = async (req, res) => {
  try {
    const { slug, instructorId } = req.params
    const { title, content, video } = req.body

    // Validating instructor
    if (req.user._id != instructorId) {
      return res.status(400).send('Unauthorized')
    }

    const updated = await Course.findOneAndUpdate(
      { slug },
      {
        $push: { lessons: { title, content, video, slug: slugify(title) } },
      },
      { new: true }
    )
      .populate('instructor', '_id name')
      .exec()
    res.json(updated)
  } catch (err) {
    console.log(err)
    return res.status(400).send('Add lesson failed')
  }
}

export const update = async (req, res) => {
  try {
    const { slug } = req.params
    const course = await Course.findOne({ slug }).exec()

    if (req.user._id != course.instructor._id) {
      return res.status(400).send('Unauthorized')
    }

    const updated = await Course.findOneAndUpdate(
      { slug },
      { ...req.body, slug: slugify(req.body.name.toLowerCase()) },
      {
        new: true,
      }
    ).exec()

    res.json(updated)
  } catch (err) {
    console.log(err)
    return res.status(400).send(err.message)
  }
}

export const updateLesson = async (req, res) => {
  try {
    const { slug } = req.params
    const { _id, title, content, video, free_preview } = req.body
    const course = await Course.findOne({ slug }).exec()
    if (req.user._id != course.instructor._id) {
      return res.status(400).send('Unauthorized')
    }
    const updated = await Course.updateOne(
      { 'lessons._id': _id },
      {
        $set: {
          'lessons.$.slug': slugify(title),
          'lessons.$.title': title,
          'lessons.$.content': content,
          'lessons.$.video': video,
          'lessons.$.free_preview': free_preview,
        },
      },
      { new: true }
    ).exec()
    res.json({ ok: true })
  } catch (err) {
    console.log(err)
    return res.status(400).send('Update lesson failed')
  }
}

export const removeLesson = async (req, res) => {
  const { slug, lessonId } = req.params
  console.log(slug)
  const course = await Course.findOne({ slug }).exec()
  if (req.user._id != course.instructor) {
    return res.status(400).send('Unauthorized')
  }

  const deletedCourse = await Course.findByIdAndUpdate(course._id, {
    $pull: { lessons: { _id: lessonId } },
  }).exec()

  res.json({ ok: true })
}

export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    // find post
    const courseFound = await Course.findById(courseId)
      .select('instructor')
      .exec()
    // is owner?
    if (req.user._id != courseFound.instructor._id) {
      return res.status(400).send('Unauthorized')
    }

    let course = await Course.findByIdAndUpdate(
      courseId,
      { published: true },
      { new: true }
    ).exec()
    // return;
    res.json(course)
  } catch (err) {
    console.log(err)
    return res.status(400).send('Course Publish Failed')
  }
}

export const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    // find post
    const courseFound = await Course.findById(courseId)
      .select('instructor')
      .exec()
    // is owner?
    if (req.user._id != courseFound.instructor._id) {
      return res.status(400).send('Unauthorized')
    }

    let course = await Course.findByIdAndUpdate(
      courseId,
      { published: false },
      { new: true }
    ).exec()
    // return;
    res.json(course)
  } catch (err) {
    console.log(err)
    return res.status(400).send('Course Unpublish Failed')
  }
}

// Get all courses
export const courses = async (req, res) => {
  // console.log("all courses");
  const all = await Course.find({ published: true })
    .populate('instructor', '_id name')
    .exec()
  // console.log("============> ", all);
  res.json(all)
}

// Check if user is enrolled to the course or not
export const checkEnrollment = async (req, res) => {
  const courseId = req.params.courseId
  // find courses of the currently logged in user
  const user = await User.findById(req.user._id).exec()
  // Check if course id is found in user courses array
  let ids = []
  let length = user.courses && user.courses.length
  for (let i = 0; i < length; i++) {
    ids.push(user.courses[i].toString())
  }
  res.json({
    status: ids.includes(courseId),
    course: await Course.findById(courseId).exec(),
  })
}

// Handle Free Enrollment Request
export const freeEnrollment = async (req, res) => {
  try {
    const courseId = req.params.courseId
    const course = await Course.findById(courseId).exec()
    if (course.paid) return // Validation

    const result = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { courses: course._id },
      },
      { new: true }
    ).exec()

    res.json({
      message: 'Congratulations! Enrollment Successful',
      course,
    })
  } catch (err) {
    console.log(err)
    return res.status(400).send('Enrollment Failed!')
  }
}

// Handle Paid Enrollment Request
export const paidEnrollment = async (req, res) => {
  try {
    // Check if course is paid or free
    const courseId = req.params.courseId
    const course = await Course.findById(courseId).populate('instructor').exec()
    if (!course.paid) return // Validation

    //Application Fee 30%
    const fee = (course.price * 30) / 100
    // Create stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      // purchase details
      line_items: [
        {
          name: course.name,
          amount: Math.round(course.price.toFixed(2) * 100),
          currency: 'usd',
          quantity: 1,
        },
      ],
      // Charge buyer & transfer remaining balance to seller (after fee)
      payment_intent_data: {
        application_fee_amount: Math.round(fee.toFixed(2) * 100),
        transfer_data: {
          destination: course.instructor.stripe_account_id,
        },
      },
      // Redirect url after successful payment
      success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    })
    console.log('Session Id---->', session)

    await User.findByIdAndUpdate(req.user._id, {
      stripeSession: session,
    }).exec()

    res.send(session.id)
  } catch (err) {
    console.log(err)
    return res.status(400).send('Paid Enrollment Failed!')
  }
}

export const stripeSuccess = async (req, res) => {
  try {
    // Find course
    const course = await Course.findById(req.params.courseId).exec()
    // Get user from db to get stripe session id
    const user = await User.findById(req.user._id).exec()
    // If no stripe session id -> Return
    if (!user.stripeSession.id) return res.sendStatus(400)
    // retrieve stripe session
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    )
    console.log('STRIPE SUCCESS--->', session)
    // If session payment status is paid, push course to user's course array.
    if (session.payment_status === 'paid') {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { courses: course._id },
        $set: { stripeSession: {} },
      }).exec()
    }
    res.json({ success: true, course })
  } catch (err) {
    console.log('Stripe Success Error-->', err)
    res.json({ success: false })
  }
}

export const userCourses = async (req, res) => {
  const user = await User.findById(req.user._id).exec()
  const courses = await Course.find({ _id: { $in: user.courses } })
    .populate('instructor', '_id name')
    .exec()
  res.json(courses)
}

export const markCompleted = async (req, res) => {
  const { courseId, lessonId } = req.body
  // console.log(courseId, lessonId);
  // find if user with that course is already created
  const existing = await Completed.findOne({
    user: req.user._id,
    course: courseId,
  }).exec()

  if (existing) {
    // update
    const updated = await Completed.findOneAndUpdate(
      {
        user: req.user._id,
        course: courseId,
      },
      {
        $addToSet: { lessons: lessonId },
      }
    ).exec()
    res.json({ ok: true })
  } else {
    // create
    const created = await new Completed({
      user: req.user._id,
      course: courseId,
      lessons: lessonId,
    }).save()
    res.json({ ok: true })
  }
}

export const listCompleted = async (req, res) => {
  try {
    const list = await Completed.findOne({
      user: req.user._id,
      course: req.body.courseId,
    }).exec()
    list && res.json(list.lessons)
  } catch (err) {
    console.log(err)
  }
}

export const markIncomplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body

    const updated = await Completed.findOneAndUpdate(
      {
        user: req.user._id,
        course: courseId,
      },
      {
        $pull: { lessons: lessonId },
      }
    ).exec()
    res.json({ ok: true })
  } catch (err) {
    console.log(err)
  }
}
