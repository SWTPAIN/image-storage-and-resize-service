import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda'
import request from 'request'
import * as AWS from 'aws-sdk'
import { encode } from 'node-base64-image'
import * as fileType from 'file-type'
import * as R from 'ramda'
import uploadImageToS3 from '../uploadImageToS3'
import getImageId from '../getImageId'

const bucket = process.env.ORIGINAL_IMAGE_BUCKET
console.log('bucket: ', bucket)

const imageUrlToBase64Buffer = (imageUrl: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    encode(imageUrl, { string: false}, (error, result) => {
      if (error) reject(error)
      if (result) resolve(result)
    })
  })

const storeOriginal: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  const requestBody = JSON.parse(event.body)
  const remoteImageUrl = requestBody['imageUrl']
  if (!remoteImageUrl) {
    context.fail(new Error('image_url is required in the body'))
    return
  }
  try {
    const imageBuffer = await imageUrlToBase64Buffer(remoteImageUrl)
    const imageId = getImageId(remoteImageUrl)
    const imageUrl = await uploadImageToS3(imageBuffer, imageId, bucket)
    cb(
      null,
      {
        statusCode: 200,
        body: JSON.stringify({image: imageUrl})
      }
    )
  } catch (e) {
    context.fail(e)
  }
}

export default storeOriginal
