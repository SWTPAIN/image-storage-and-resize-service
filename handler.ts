import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda'
import request from 'request'
import * as AWS from 'aws-sdk'
import sharp from 'sharp'
import { encode } from 'node-base64-image'
import * as fileType from 'file-type'
import * as R from 'ramda'
import * as sha1 from 'sha1'

const s3 = new AWS.S3()
const bucket = process.env.ORIGINAL_IMAGE_BUCKET

const storeImageToS3 = (imageBuffer: Buffer, imageUrlHash: String) : Promise<String> => {
  return new Promise((resolve, reject) => {
    const fileTypeInfo = fileType(imageBuffer)
    if (isValidFileType(fileTypeInfo)) {
    } else {
      reject(new Error(`File type is not supported: mime: ${fileTypeInfo.mime}, ext: ${fileTypeInfo.ext}`))
    }

    const now = new Date()
    const fileName = `${imageUrlHash}.${fileTypeInfo.ext}`
    const params = {
      Body: imageBuffer,
      Key: fileName,
      Bucket: bucket,
      ContentEncoding: 'base64',
      ContentType: fileTypeInfo.mime
    }

    s3.putObject(params, (err, data) => {
      if (err) {
        reject(new Error(`error in putting object in s3: status code: ${[err.statusCode]}, message: ${[err.message]}`))
      };
      resolve(JSON.stringify(data))
    })
  })
}

const imageUrlToBase64Buffer = (imageUrl: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    encode(imageUrl, { string: false}, (error, result) => {
      if (error) reject(error)
      if (result) resolve(result)
    })
  })

const SUPPORTED_MIME_TPES = [
  'image/gif',
  'image/jpeg',
  'image/png'
]

const isValidFileType : ((fileType: fileType.FileTypeResult) => Boolean) =
  R.compose(x => R.contains(x, SUPPORTED_MIME_TPES), R.prop('mime'))

export const hello: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  const requestBody = JSON.parse(event.body)
  const remoteImageUrl = requestBody['imageUrl']
  if (!remoteImageUrl) {
    context.fail(new Error('image_url is required in the body'))
    return
  }
  try {
    const imageBuffer = await imageUrlToBase64Buffer(remoteImageUrl)
    const remoteImageUrlHash = sha1(remoteImageUrl)
    const imageUrl = await storeImageToS3(imageBuffer, remoteImageUrlHash)
    cb(
      null,
      {
        statusCode: 200,
        body: JSON.stringify({image: imageUrl})
      }
    )
  } catch (e) {
    cb(e)
  }
}
