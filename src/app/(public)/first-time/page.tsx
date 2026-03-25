import type { Metadata } from 'next'

import { PageHero, SectionHeader } from '@/components/ui'

export const metadata: Metadata = {
  title: 'First Time Visiting?',
  description:
    'A guide for first-time visitors to St. Basil\'s Syriac Orthodox Church in Boston, Massachusetts. Learn about our worship traditions, dress code, and what to expect.',
}

const guidelines = [
  {
    title: 'Entering Sacred Space',
    paragraphs: [
      'If you come from a Protestant or non-liturgical tradition, you may feel overwhelmed upon entering our Syrian Orthodox sanctuary. You will find yourself surrounded by the glory of richly colored vestments and sacred icons that proclaim the faith of ages past. The blessed aroma of incense will fill the air, purifying both body and spirit. Ancient melodies will lift your heart, while the faithful around you participate in time-honored acts of devotion\u2014lighting candles, venerating icons, making the sign of the cross, bowing in reverence, and standing in prayer.',
      'Remember that each element serves one sacred purpose: to draw us closer to the Almighty. Every word, prayer, song, image, and gesture carries profound spiritual significance that reveals the depths of our faith.',
    ],
  },
  {
    title: 'Appropriate Attire',
    paragraphs: [
      'Our congregation primarily consists of Malayalee families from Kerala, India, and you will often see traditional Indian attire during our services. If you do not have such clothing, we warmly welcome you in business casual or your finest attire\u2014what matters most is that you come with a prepared heart to worship our Lord.',
    ],
  },
  {
    title: 'Sacred Covering for Women',
    paragraphs: [
      'In reverence to our ancient tradition and in accordance with the Apostle Paul\u2019s teaching in 1 Corinthians 11, we humbly request that women cover their heads with a veil during the Divine Liturgy. This blessed practice expresses honor and reverence for God, symbolizes submission to divine authority, and reflects the holiness of this sacred space. We follow the example of the blessed women of Scripture who worshipped the Lord with covered heads. If you are able, please bring a veil when entering the sanctuary.',
    ],
  },
  {
    title: 'Standing in Worship',
    paragraphs: [
      'Following the Syrian Orthodox tradition, the faithful stand throughout nearly the entire Divine Liturgy, as we believe this posture best expresses our reverence before the throne of God. Some parishes may have limited seating available for the elderly and those with physical needs. If standing becomes challenging, you are welcome to sit as needed\u2014your presence in worship is what matters most to our Lord.',
    ],
  },
  {
    title: 'The Sign of the Cross',
    paragraphs: [
      'We make the sacred sign of the cross frequently throughout our worship, particularly when the Trinity is invoked or when venerating the cross and icons. Using our right hand, we touch our forehead, chest, left shoulder, then right shoulder, holding our thumb and first two fingers together to represent the Holy Trinity. Don\u2019t feel compelled to follow every gesture perfectly\u2014your sincere participation is what God desires.',
    ],
  },
  {
    title: 'The Holy Eucharist',
    paragraphs: [
      'The most sacred moment of our worship is the reception of Holy Communion\u2014the true Body and Blood of our Lord Jesus Christ. This blessed sacrament is reserved for those who have been baptized into the faith and have prepared their hearts through prayer and fasting.',
      'When the faithful approach for communion, we stand in reverence and open our mouths to receive the wine-soaked bread, now transformed into Christ\u2019s Body and Blood. After receiving communion, we are offered water to ensure that no particle of our Lord\u2019s precious Body and Blood remains in our mouths when we speak or sing.',
      'Following the Divine Liturgy, blessed bread may be distributed as a sign of fellowship, allowing all present to share in the common loaf, even those who have not received the Eucharist.',
    ],
  },
  {
    title: 'Confession and Preparation',
    paragraphs: [
      'While our Divine Liturgy includes the Hoosoyo (propitiatory prayer) where our priest seeks God\u2019s mercy and absolution for the entire congregation, we encourage the faithful to make regular private confession to Christ in the presence of a priest. It is a requirement to partake in Confession every 40 days. As we are human, within those 40 days, the Hoosoyo prayer is there to absolve us of our sins. Both are a requirement to receive the Holy Communion. You must be present for the Hoosoyo, as well as the whole Divine Liturgy, to partake.',
      'The Apostle Paul warns us: \u201CSo then, whoever eats the bread or drinks the cup of the Lord in an unworthy manner will be guilty of sinning against the body and blood of the Lord. Everyone ought to examine themselves before they eat of the bread and drink from the cup. For those who eat and drink without discerning the body of Christ eat and drink judgment on themselves\u201D (1 Corinthians 11:27\u201329). Therefore, we must approach the Holy Eucharist with proper spiritual preparation and reverence.',
    ],
  },
  {
    title: 'Holy Ground',
    paragraphs: [
      'Following the example of Moses, who was commanded to remove his sandals before the burning bush because he stood on holy ground (Exodus 3:5), we reverently remove our shoes before entering the sanctuary. This ancient practice acknowledges that we stand in the presence of the living God and approach His altar with the utmost respect and humility.',
    ],
  },
  {
    title: 'Sacred Timing',
    paragraphs: [
      'Our Morning Prayer begins at 8:30 AM, followed by the Divine Liturgy at 9:15 AM. To maintain the sanctity of worship, please wait to enter or move to your seat when the priest is facing the congregation and speaking\u2014particularly during the Gospel reading or the Procession of the Holy Mysteries, when the sacred elements are brought forward.',
    ],
  },
  {
    title: 'Liturgical Music',
    paragraphs: [
      'Approximately seventy-five percent of our worship consists of congregational singing, led by our faithful choir. These ancient melodies, sung in various traditional tones, have lifted hearts to heaven for centuries. We encourage all to participate as they are able, allowing the sacred music to carry your prayers to the throne of grace.',
    ],
  },
  {
    title: 'All Are Welcome',
    paragraphs: [
      'We joyfully welcome every soul who seeks to worship the Lord, regardless of background or familiarity with our traditions. Our sanctuary has been blessed as a place where countless prayers have been heard and answered. We strive to create a sacred space where all may encounter God\u2019s love and learn about our ancient faith.',
      'While our services blend Malayalam, Syriac, and English, the language of worship transcends words\u2014it is the language of the heart seeking God. Though our Syrian Orthodox traditions may seem unfamiliar at first, we trust that the Holy Spirit will guide you into deeper understanding and that our church will, in time, feel like a spiritual home where you may grow in faith and draw closer to the Kingdom of God.',
    ],
  },
] as const

export default function FirstTimePage() {
  return (
    <>
      <PageHero
        title="A Guide to Our Sacred Worship"
        backgroundImage="/images/first-time-hero.jpg"
      />

      {/* Welcome Introduction */}
      <section className="bg-cream-50 px-4 py-16 sm:px-6 md:py-22 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-center font-body text-base italic leading-relaxed text-wood-800 md:text-lg">
            Whether you are joining us for the first time or returning to worship after some time
            away, we hope these gentle reminders and insights will help you fully participate in the
            sacred beauty of our Divine Liturgy. Our desire is that every soul who enters this holy
            place may encounter the living God and experience the profound joy of Syrian Orthodox
            worship.
          </p>
        </div>
      </section>

      {/* Archbishop Quote */}
      <section className="bg-cream-50 px-4 pb-16 sm:px-6 md:pb-22 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <blockquote className="rounded-lg bg-charcoal p-8 shadow-md md:p-10">
            <p className="font-heading text-base italic leading-loose text-cream-50 md:text-lg">
              &ldquo;In the Holy Syrian Orthodox Church the beauty and bliss of the religious life
              is its rich and inviting worship and the Holy Qurbono is the central act of worship.
              In the Holy Services of our Church the whole person &mdash; all the senses &mdash;
              are involved. Seeing the divine experience unfolding in the altar, hearing the
              melodious chants and hymns of the celebrant and congregation, smelling the fragrant
              aroma of incense which purifies the body and spirit, the gentle touch of our fellow
              brethren during the kiss of peace, and the pleasant taste of the body and blood of
              our dear Lord Jesus Christ emulates the most breathtaking heavenly experience. Hence
              a person should come with a prepared heart and mind to participate in the Holy
              Sacrament. The Sacrament is only as meaningful as the effort put forth by the
              individual. Participating in the Sacrament by singing the hymns, meditating in the
              prayers, and giving proper and timely responses will definitely transpire us to an
              amazing and unique experience.&rdquo;
            </p>
            <footer className="mt-6 text-right font-body text-sm text-gold-500">
              &mdash; A Guide to the Holy Qurbono, Prepared by Archbishop Mor Titus Yeldho
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Guidelines */}
      <section className="bg-cream-50 px-4 pb-16 sm:px-6 md:pb-22 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <SectionHeader
            title="What to Expect"
            subtitle="A guide to help you feel at home in our worship"
            className="mb-12 md:mb-16"
          />

          <ol className="space-y-12 md:space-y-16">
            {guidelines.map((item, index) => (
              <li key={item.title} className="flex gap-4 md:gap-6">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-burgundy-700 font-body text-sm font-semibold text-cream-50 md:h-12 md:w-12 md:text-base"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-heading text-xl font-semibold leading-tight text-wood-900 md:text-2xl">
                    {item.title}
                  </h3>
                  <div className="mt-3 space-y-4">
                    {item.paragraphs.map((text, pIndex) => (
                      <p
                        key={pIndex}
                        className="font-body text-base leading-relaxed text-wood-800"
                      >
                        {text}
                      </p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing Quote */}
      <section className="bg-cream-50 px-4 pb-16 sm:px-6 md:pb-22 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <blockquote className="rounded-lg bg-charcoal p-8 shadow-md md:p-10">
            <p className="text-center font-heading text-lg italic leading-relaxed text-cream-50 md:text-xl">
              &ldquo;We pray that your visit will be blessed and that you will find here the peace
              and joy that only Christ can give.&rdquo;
            </p>
          </blockquote>
        </div>
      </section>
    </>
  )
}
