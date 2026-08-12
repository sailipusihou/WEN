import fs from 'fs'
import { getAllSocialAccounts } from '../lib/social-accounts'
import {
  getInstagramTimeline,
  publishInstagramContainer,
  publishInstagramMedia,
} from '../lib/instagram'
import { createReferralLink } from '../lib/referral-tracking'
import { createSocialContentRecord } from '../lib/social-content'

async function run() {
  const accounts = getAllSocialAccounts()
  const account = accounts.find((item) => item.platform === 'instagram' && item.status === 'connected')

  if (!account?.accessToken) {
    throw new Error('No connected Instagram account available for live publish test.')
  }

  const products = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'))
  const product = products.find((item: any) => item.id === 'celadon-tea-set') || products[0]

  if (!product?.image) {
    throw new Error('No usable product image found for Instagram live publish test.')
  }

  const productName = product.nameEn || product.name
  const publishedAt = new Date().toISOString()
  const hashtags = '#orientaltreasures #celadon #teaculture #chinesecraft'
  const title = `${productName} Instagram Publish Test`
  const caption = [
    'A quiet moment, shaped by craft.',
    '',
    `Our ${productName} brings the calm of Longquan celadon into everyday tea rituals. Explore the details through the link in bio.`,
    '',
    hashtags,
  ].join('\n')

  const referral = createReferralLink({
    staffId: account.staffId,
    staffName: account.staffName,
    staffAvatar: account.staffAvatar,
    platform: 'instagram',
    platformUsername: account.username,
    productId: product.id,
    productName,
    contentTitle: title,
    contentBody: caption,
    hashtags,
    contentType: 'social_post',
    tone: 'luxury',
    publishedAt,
  })
  console.log('REFERRAL_URL=', referral.url)

  const { containerId } = await publishInstagramMedia(account.accessToken, product.image, caption, 'IMAGE')
  console.log('CONTAINER_ID=', containerId)

  const { mediaId } = await publishInstagramContainer(account.accessToken, containerId)
  console.log('MEDIA_ID=', mediaId)

  await new Promise((resolve) => setTimeout(resolve, 6000))
  const timeline = await getInstagramTimeline(account.accessToken, 6)
  const matched = timeline.find((item) => item.id === mediaId) || timeline[0]

  const record = createSocialContentRecord({
    accountId: account.id,
    staffId: account.staffId,
    staffName: account.staffName,
    staffAvatar: account.staffAvatar,
    platform: 'instagram',
    platformName: 'Instagram',
    platformUsername: account.username,
    status: 'published',
    publishMode: 'api',
    contentTitle: title,
    contentBody: caption,
    hashtags,
    contentType: 'social_post',
    tone: 'luxury',
    mediaUrl: product.image,
    mediaType: 'IMAGE',
    productId: product.id,
    productName,
    referralLinkId: referral.id,
    referralCode: referral.code,
    referralUrl: referral.url,
    platformPostId: mediaId,
    platformPostUrl: matched?.permalink,
    note: 'Live Instagram publish test completed through API.',
    publishedAt,
  })

  console.log('RECORD_ID=', record.id)
  console.log('POST_URL=', matched?.permalink || '')
}

run().catch((error) => {
  console.error('PUBLISH_TEST_ERROR:', error)
  process.exit(1)
})
