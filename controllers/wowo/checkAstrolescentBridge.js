import prisma from "../../lib/prisma.js";
import {api} from "../../helpers/api.js";

export async function checkAstrolescentBridge(wowoUser, xrdAddress) {
    let stepAstrolescentReward = await prisma.wowoReward.findFirst({
        where: {
            wowoUserId: wowoUser.id,
            step: "stepAstrolescent"
        }
    });

    if (!stepAstrolescentReward) {
        //STEP 3 MUST BE COMPLETED BEFORE STEP Astrolescent
        const step3Reward = await prisma.wowoReward.findFirst({
            where: {
                wowoUserId: wowoUser.id,
                step: "step3",
                state: "completed"
            }
        });
        if (step3Reward) {
            const bridgeFound = (await api.checkBridge(xrdAddress)).hasBridged;

            if (bridgeFound) {
                stepAstrolescentReward = await prisma.wowoReward.findFirst({
                    where: {
                        wowoUserId: wowoUser.id,
                        step: "stepAstrolescent"
                    }
                });
                if (!stepAstrolescentReward) {
                    const reward = await prisma.wowoReward.create({
                        data: {
                            xrdAddress: xrdAddress,
                            state: 'claimable',
                            rewardTrxId: '',
                            data: '',
                            wowoUserId: wowoUser.id,
                            step: "stepAstrolescent"
                        }
                    });
                }
            }
        }
    }
}
