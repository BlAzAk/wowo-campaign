import prisma from "../../lib/prisma.js";
import {StopActiveWave} from "./StopActiveWave.js";

export async function StartNewWave(nbSlots, address) {
    nbSlots = Math.floor(Number(nbSlots));

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

    if (allowedAddresses.includes(address)) {
        await StopActiveWave(address);

        await prisma.wowoWave.create({
            data: {
                slots: nbSlots,
                nbUsers: 0,
                active: true,
                startAt: new Date(),
                endAt: new Date(),
            },
        });
    }
    return response;
}
