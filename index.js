import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import {ClaimStep1} from "./controllers/wowo/ClaimStep1.js";
import {GetStates} from "./controllers/wowo/GetStates.js";
import {ClaimStep2} from "./controllers/wowo/ClaimStep2.js";
import {SetTelegram} from "./controllers/wowo/SetTelegram.js";
import {GetUsers} from "./controllers/wowo/GetUsers.js";
import {SetTelegramMembers} from "./controllers/wowo/SetTelegramMembers.js";
import {ClaimStep3} from "./controllers/wowo/ClaimStep3.js";
import {ClaimStep4} from "./controllers/wowo/ClaimStep4.js";
import {GetCampaignData} from "./controllers/wowo/GetCampaignData.js";
import {GetWave} from "./controllers/wowo/GetWave.js";
import {ClaimStep5} from "./controllers/wowo/ClaimStep5.js";
import {GetUser} from "./controllers/wowo/GetUser.js";
import {ClaimStepAstrolescent} from "./controllers/wowo/ClaimStepAstrolescent.js";
import {SetFarmer} from "./controllers/wowo/SetFarmer.js";
import {StopActiveWave} from "./controllers/wowo/StopActiveWave.js";
import {StartNewWave} from "./controllers/wowo/StartNewWave.js";

const limiter = rateLimit({
    windowMs: 5 * 1000, // 5 seconds
    limit: 1, // each IP can make up to 1 requests per `windowsMs` (5 seconds)
    standardHeaders: true, // add the `RateLimit-*` headers to the response
    legacyHeaders: false, // remove the `X-RateLimit-*` headers from the response
    message: 'Too Many Requests - You can only access this URL once.',
});

const app = express();
app.set("trust proxy", true);
app.use(express.json({limit: '50mb'}));
app.use(cors({
    origin: '*'
}));

app.listen(8989, () => {
    console.log('Server listening', 'http://localhost:8989')
});

//WOWO
app.post('/wowo-get-all-users', async (req,res) => {
    const response = await GetUsers();
    res.status(response.code).json(response)
});
app.post('/wowo-get-user', async (req,res) => {
    const response = await GetUser({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip, req.headers['wowo-action'] || null);
    res.status(response.code).json(response)
});
app.post('/wowo-get-states', async (req,res) => {
    const response = await GetStates({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.post('/wowo-telegram-login', async (req,res) => {
    const response = await SetTelegram({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.post('/wowo-telegram-members', async (req,res) => {
    const response = await SetTelegramMembers(req.body.data);
    res.status(response.code).json(response)
});
app.post('/wowo-claim-step1', limiter, async (req,res) => {
    const response = await ClaimStep1({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.post('/wowo-claim-step2', limiter, async (req,res) => {
    const response = await ClaimStep2({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.post('/wowo-claim-step3', limiter, async (req,res) => {
    const response = await ClaimStep3({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.post('/wowo-claim-step4', limiter, async (req,res) => {
    const response = await ClaimStep4({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.post('/wowo-claim-step-astrolescent', limiter, async (req,res) => {
    const response = await ClaimStepAstrolescent({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.post('/wowo-claim-step5', limiter, async (req,res) => {
    const response = await ClaimStep5({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});
app.get('/wowo-get-campaign-data/:address', async (req,res) => {
    const response = await GetCampaignData(req.params.address);
    res.status(response.code).json(response)
});
app.get('/wowo-set-farmer/:userId/:address', async (req,res) => {
    const response = await SetFarmer(req.params.userId, req.params.address);
    res.status(response.code).json(response)
});
app.get('/wowo-start-new-wave/:nbSlots/:address', async (req,res) => {
    const response = await StartNewWave(req.params.nbSlots, req.params.address);
    res.status(response.code).json(response)
});
app.get('/wowo-stop-active-wave/:address', async (req,res) => {
    const response = await StopActiveWave(req.params.address);
    res.status(response.code).json(response)
});
app.post('/wowo-get-wave', async (req,res) => {
    const response = await GetWave({iv: req.headers['wowo-iv'], data: req.body.data}, req.ip);
    res.status(response.code).json(response)
});