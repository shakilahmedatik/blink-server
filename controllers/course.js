import { nanoid } from 'nanoid'
import slugify from 'slugify'
import Course from '../models/course'
// import { readFileSync } from 'fs'
const imgbbUploader = require('imgbb-uploader')
const cloudinary = require('cloudinary').v2
const fs = require('fs')

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

export const courses = async (req, res) => {
  // console.log("all courses");
  const all = await Course.find({ published: true })
    .populate('instructor', '_id name')
    .exec()
  // console.log("============> ", all);
  res.json(all)
}
