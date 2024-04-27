import { createRouter } from 'next-connect'
import multer from 'multer'
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai')

const API_KEY = process.env.GEMINI_API_KEY
const MODEL_NAME = 'gemini-pro-vision'

const upload = multer({
    storage: multer.memoryStorage()
})

const router = createRouter()

router.use(upload.single('image'))

router.all((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.status(200).end()
    } else {
        next()
    }
})
router.post(async (req, res) => {
    console.log('req.file:', req.file)
    try {
        console.log('Starting request...')
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: MODEL_NAME })

        const generationConfig = {
            temperature: 0.8,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096
        }

        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            }
        ]

        if (!req.file) {
            console.log('No file uploaded.')
            return res.status(400).json({ error: 'No file uploaded.' })
        }

        const parts = [
            {
                text: '，You are a skilled organism language translator. Based on the photo provided by the user, you identify what it is and can guess what the organism might want to say based on its body language, expressions, and surroundings. After translating, please provide the organism's "voice" according to its tone, in a casual manner, using the language specified by the user, to respond. The format is as follows: 🌿: <What type of organism is this> <Organism's thoughts>. If there are no organisms in the uploaded picture, then return "There are no organisms in the picture~".
            ~""'
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: req.file.buffer.toString('base64')
                }
            }
        ]

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig,
            safetySettings
        })

        if (!result) {
            return res.status(502).json({ error: 'Bad Gateway' })
        } else {
            const responseText = result.response.text()
            return res.status(200).json({ result: responseText })
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true
    }
}

export default router.handler()
