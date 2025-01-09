import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";
import {getWowoUser} from "../../helpers/getWowoUser.js";
import {checkOciswapSwap} from "./checkOciswapSwap.js";
import {checkTelegramMembership} from "./checkTelegramMembership.js";
import {variables} from "../../config/variables.js";
import {checkStaking} from "./checkStaking.js";
import {checkClaimBadge} from "./checkClaimBadge.js";
import {checkAstrolescentBridge} from "./checkAstrolescentBridge.js";

export async function GetStates(content, ip) {
    let response = {
        code: 200,
        message: "",
        data: '',
    }

    try {
        const body = JSON.parse(await decryptSymmetric(content.data, content.iv, keys.wowoEncryptionKey));

        const uniqUserId = body.uniqUserId;
        const xrdAddress = body.xrdAddress;

        let wowoUser = await getWowoUser(ip, uniqUserId, xrdAddress);

        const steps = {
            step1State: 'locked', // Connect radix wallet
            step2State: 'locked', // Do swap on Ociswap
            step3JoinWOWO: 'doable', // Join WOWO telegram channel
            step3JoinRadix: 'doable', // Join Radix telegram channel
            step3State: 'locked', // Claim telegram reward
            step4State: 'locked', // Stake 100 XRD on WOWO validator
            step5State: 'locked', // Claim badge
            stepAstrolescentState: 'locked', // Astrolescent bridge
        }

        if (wowoUser !== null) {
            if (xrdAddress) {
                await checkOciswapSwap(wowoUser, xrdAddress);
                await checkTelegramMembership(wowoUser, xrdAddress);
                if (wowoUser.telegramData) {
                    const channelsMembership = JSON.parse(wowoUser.telegramData).channelsMember;
                    if (channelsMembership.includes(variables.radixTelegramChannel)) {
                        steps.step3JoinRadix = 'joined';
                    }
                    if (channelsMembership.includes(variables.wowoTelegramChannel)) {
                        steps.step3JoinWOWO = 'joined';
                    }
                }
                await checkAstrolescentBridge(wowoUser, xrdAddress);
                await checkStaking(wowoUser, xrdAddress);
                await checkClaimBadge(wowoUser, xrdAddress);
            }

            const stepsRewards = await prisma.wowoReward.findMany({
                where: {
                    wowoUserId: wowoUser.id,
                }
            });

            for (let stepReward of stepsRewards) {
                // Connect radix wallet
                if (stepReward.step === "step1" && stepReward.state === "completed") {
                    steps.step1State = "claimed";
                }

                // Do swap on Ociswap
                if (stepReward.step === "step2") {
                    if (stepReward.state === "claimable") {
                        steps.step2State = "claimable";
                    }
                    if (stepReward.state === "completed") {
                        steps.step2State = "claimed";
                    }
                }

                // Join telegram channels
                if (stepReward.step === "step3") {
                    if (stepReward.state === "claimable") {
                        steps.step3State = "claimable";
                    }
                    if (stepReward.state === "completed") {
                        steps.step3State = "claimed";
                    }
                }

                // Do bridge on Astrolescent
                if (stepReward.step === "stepAstrolescent") {
                    if (stepReward.state === "claimable") {
                        steps.stepAstrolescentState = "claimable";
                    }
                    if (stepReward.state === "completed") {
                        steps.stepAstrolescentState = "claimed";
                    }
                }

                // Stake 1000 XRD on WOWO validator
                if (stepReward.step === "step4") {
                    if (stepReward.state === "in progress") {
                        steps.step4State = JSON.parse(stepReward.data).stakingDate;
                    }
                    if (stepReward.state === "claimable") {
                        steps.step4State = "claimable";
                    }
                    if (stepReward.state === "completed") {
                        steps.step4State = "claimed";
                    }
                }

                // Claim badge
                if (stepReward.step === "step5") {
                    if (stepReward.state === "claimable") {
                        steps.step5State = "claimable";
                    }
                    if (stepReward.state === "completed") {
                        steps.step5State = "claimed";
                    }
                }
            }
        }

        response.data = (await encryptSymmetric(
            JSON.stringify({
                    stepsStates: steps
                }
            ),
            keys.wowoEncryptionKey,
            content.iv
        )).ciphertext;

    } catch (e) {
        console.log(e);
        response.code = 500;
    }

    return response;
}
