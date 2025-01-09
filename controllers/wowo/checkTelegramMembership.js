import prisma from "../../lib/prisma.js";
import {variables} from "../../config/variables.js";

export async function checkTelegramMembership(wowoUser, xrdAddress) {
    let step3Reward = await prisma.wowoReward.findFirst({
        where: {
            wowoUserId: wowoUser.id,
            step: "step3"
        }
    });

    if (!step3Reward) {
        //STEP 2 MUST BE COMPLETED BEFORE STEP 3
        const step2Reward = await prisma.wowoReward.findFirst({
            where: {
                wowoUserId: wowoUser.id,
                step: "step2",
                state: "completed"
            }
        });
        if (step2Reward) {
            let joinedChannels = false;
            const channelsMembership = JSON.parse(wowoUser.telegramData)?.channelsMember ?? [];

            if (channelsMembership.includes(variables.radixTelegramChannel) && channelsMembership.includes(variables.wowoTelegramChannel)) {
                joinedChannels = true;
            }

            if (joinedChannels) {
                step3Reward = await prisma.wowoReward.findFirst({
                    where: {
                        wowoUserId: wowoUser.id,
                        step: "step3"
                    }
                });
                if (!step3Reward) {
                    const reward = await prisma.wowoReward.create({
                        data: {
                            xrdAddress: xrdAddress,
                            state: 'claimable',
                            rewardTrxId: '',
                            data: '',
                            wowoUserId: wowoUser.id,
                            step: "step3"
                        }
                    });
                }
            }
        }
    }
}
