import prisma from "../../lib/prisma.js";

export async function checkClaimBadge(wowoUser, xrdAddress) {
    let step5Reward = await prisma.wowoReward.findFirst({
        where: {
            wowoUserId: wowoUser.id,
            step: "step5"
        }
    });

    if (!step5Reward) {
        //STEP 4 MUST BE COMPLETED BEFORE STEP 5
        const step4Reward = await prisma.wowoReward.findFirst({
            where: {
                wowoUserId: wowoUser.id,
                step: "step4",
                state: "completed"
            }
        });
        if (step4Reward) {
            step5Reward = await prisma.wowoReward.findFirst({
                where: {
                    wowoUserId: wowoUser.id,
                    step: "step5"
                }
            });
            if (!step5Reward) {
                const reward = await prisma.wowoReward.create({
                    data: {
                        xrdAddress: xrdAddress,
                        state: 'claimable',
                        rewardTrxId: '',
                        data: '',
                        wowoUserId: wowoUser.id,
                        step: "step5"
                    }
                });
            }
        }
    }
}
