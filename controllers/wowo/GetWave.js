import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";

export async function GetWave(content, ip) {
    let response = {
        code: 200,
        message: "",
        data: '',
    }

    try {
        const body = JSON.parse(await decryptSymmetric(content.data, content.iv, keys.wowoEncryptionKey));

        let waves = await prisma.wowoWave.findMany({
            where: {
                active: true
            }
        });

        if (waves.length > 0) {
            response.data = (await encryptSymmetric(
                JSON.stringify({
                        wave: waves[0]
                    }
                ),
                keys.wowoEncryptionKey,
                content.iv
            )).ciphertext;
        } else {
            response.code = 404;
        }
    } catch (e) {
        console.log(e);
        response.code = 500;
    }

    return response;
}
