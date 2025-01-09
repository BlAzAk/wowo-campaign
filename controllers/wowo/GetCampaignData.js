import prisma from "../../lib/prisma.js";

export async function GetCampaignData(address) {
    let response = {
        code: 200,
        message: "",
        data: {},
    }

    const allowedAddresses = [
        'account_rdx12yflurq57f4rp0dj0rkq5whljpzc3ahpp7u6uzatr2ft059uj4n8rn', //Cédric
        'account_rdx16x8p4n8tzr4cfs0cjvjxe9ww9uq42ncktljp44ttt5damre9rcfnn6', //Pascal
        'account_rdx169gztast30zrqv6unyeur830mvs9thys0avt8e8752l0n0zskjquuy', //Ward
    ]

    let waves = [];
    if (allowedAddresses.includes(address)) {
        waves = await prisma.wowoWave.findMany({
            include: {
                users: {
                    include: {rewards: true}
                }
            },
        });
    }

    response.data['waves'] = waves;

    return response;
}
