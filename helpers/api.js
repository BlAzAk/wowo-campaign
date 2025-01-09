import axios from "axios";
import {variables} from '../config/variables.js';
import {
    defaultValidationConfig,
    generateRandomNonce,
    LTSRadixEngineToolkit,
    NetworkId,
    PrivateKey,
    RadixEngineToolkit,
    SimpleTransactionBuilder,
    TransactionBuilder
} from "@radixdlt/radix-engine-toolkit";
import {GatewayApiClient} from "@radixdlt/babylon-gateway-api-sdk";
import {hexToUint8Array} from "./hexToUint8Array.js";

// Initialisation de l'API Gateway
const gatewayApi = GatewayApiClient.initialize({
    basePath: variables.apiGwUrl,
    applicationName: 'My XIDAR',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const api = {
    async getTransactions(address = null, resource = null, transactions = [], cursor = null) {
        const gatewayApi = GatewayApiClient.initialize({
            basePath: variables.apiGwUrl,
            applicationName: 'My XIDAR',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa('gateway:Zhgdt5.nDD'),
                //'api-key': 'e5fb74de-47fa-4808-a235-2b1059c1b632'
            },
        });

        return new Promise(async (resolve, reject) => {
            const requestParameters = {
                cursor: cursor,
                opt_ins: {
                    balance_changes: true
                },
                limit_per_page: 100,
                order: 'Desc'
            }

            if (address) {
                requestParameters['affected_global_entities_filter'] = [address]
            }
            if (resource) {
                requestParameters['manifest_resources_filter'] = [resource]
            }

            const transactionsResp = await gatewayApi.stream.innerClient.streamTransactions({
                streamTransactionsRequest: requestParameters
            });

            const confirmedTransactions = transactionsResp.items.filter(trx => trx.transaction_status === "CommittedSuccess")

            transactions = [...transactions, ...confirmedTransactions];

            if (transactionsResp.next_cursor) {
                await new Promise(r => setTimeout(r, 1500));
                await this.getTransactions(address, resource, transactions, transactionsResp.next_cursor);
            }

            resolve(transactions);
        });
    },
    async sendManifest(fromPrivateKey, manifest) {
        let response = {
            code: 200,
            transactionId: "",
            message: ""
        }

        const fromAccountPrivateKey = new PrivateKey.Secp256k1(hexToUint8Array(fromPrivateKey)); // Conversion

        const currentStatus = await gatewayApi.status.getCurrent();

// Construction de la transaction
        const transactionBuilder = await TransactionBuilder.new();
        let transaction = await transactionBuilder
            .header({
                networkId: NetworkId.Mainnet, // Utilisation du réseau principal
                startEpochInclusive: currentStatus.ledger_state.epoch,
                endEpochExclusive: currentStatus.ledger_state.epoch + 10,
                nonce: generateRandomNonce(),
                notaryPublicKey: fromAccountPrivateKey.publicKey(),
                notaryIsSignatory: true, // Notaire signataire
                tipPercentage: 0,
            })
            .manifest(manifest)
            .sign((hashToSign) => {
                // Signature de la transaction
                return fromAccountPrivateKey.signToSignatureWithPublicKey(hashToSign);
            })
            .notarize((hashToSign) => {
                // Notarisation de la transaction
                return fromAccountPrivateKey.signToSignature(hashToSign);
            });

        // Validation statique de la transaction
        await RadixEngineToolkit.NotarizedTransaction.staticallyValidate(
            transaction,
            defaultValidationConfig(NetworkId.Mainnet)
        ).then((validation) => {
            if (validation.kind === "Invalid") {
                response.code = 500;
                response.message = "transaction";
            }
        });

        if (response.code === 200) {
            const transactionHash = await RadixEngineToolkit.NotarizedTransaction.intentHash(transaction);
            response.transactionId = transactionHash.id

            // Compilation de la transaction notarized
            const compiledNotarizedTransaction = await RadixEngineToolkit.NotarizedTransaction.compile(transaction);

            // La transaction compilée pourrait être directement sous forme d'Uint8Array ou Buffer
            // Si ce n'est pas le cas, vérifions le type de l'objet et convertissons-le en hexadécimal manuellement
            let transactionHex;
            if (compiledNotarizedTransaction instanceof Uint8Array) {
                // Si c'est un Uint8Array, on le convertit en hexadécimal
                transactionHex = Buffer.from(compiledNotarizedTransaction).toString('hex');
            } else if (compiledNotarizedTransaction.toHex) {
                // Si l'objet a déjà une méthode toHex, on l'appelle
                transactionHex = compiledNotarizedTransaction.toHex();
            } else {
                response.code = 500;
                response.message = "Cannot convert the compiled transaction to hex format"
            }

            if (response.code === 200) {
                const transactionSent = await axios.post(variables.apiGwUrl + "/transaction/submit", {
                    "notarized_transaction_hex": transactionHex
                });
            }
        }

        return response
    },
    async sendSimpleTransaction(fromPrivateKey, toAddress, resourceAddress, amount, message = '') {
        let response = {
            code: 200,
            transactionId: "",
            message: ""
        }

        const gatewayStatus = await axios.post(variables.apiGwUrl + "/transaction/construction", {});
        const networkId = NetworkId.Mainnet;
        const currentEpoch = gatewayStatus.data.ledger_state.epoch; /* Sourced from the API */

        //   Such keys can be created from hex or with `new PrivateKey.Ed25519` / `new PrivateKey.Secp256k1`
        const fromAccountPrivateKey = new PrivateKey.Secp256k1(fromPrivateKey);
        const fromAccountPublicKey = fromAccountPrivateKey.publicKey();
        const fromAccountAddress =
            await LTSRadixEngineToolkit.Derive.virtualAccountAddress(
                fromAccountPublicKey,
                networkId
            );

        const builder = await SimpleTransactionBuilder.new({
            networkId,
            validFromEpoch: currentEpoch,
            fromAccount: fromAccountAddress,
            signerPublicKey: fromAccountPublicKey,
        });

        const transaction = await builder
            .transferFungible({
                toAccount: toAddress,
                resourceAddress: resourceAddress,
                amount: amount,
            })
            .compileIntent()
            .compileNotarizedAsync(
                async (hash) => fromAccountPrivateKey.signToSignature(hash)
            );

        (await transaction.staticallyValidate(networkId)).throwIfInvalid();

        //const summary = await transaction.summarizeTransaction();


        const notarizedTransactionHex = transaction.toHex();
        //const intentHashHex = transaction.intentHashHex();
        //const notarizedTransactionHashHex = transaction.notarizedPayloadHashHex();

        const transactionSent = await axios.post(variables.apiGwUrl + "/transaction/submit", {
            "notarized_transaction_hex": notarizedTransactionHex
        });

        response.transactionId = transaction.intentHash.id

        return response;
    },
    async checkBridge(address) {
        const response = {
            code: 200,
            hasBridged: false,
            message: ""
        }
        return await new Promise((resolve, reject) => {
            axios
                .get('https://astrolescent.com/api/wowo/' + address)
                .then(bridgeRes => {
                    response.hasBridged = bridgeRes.data.hasBridged;
                    resolve(response);
                })
                .catch(error => {
                    console.log(error);
                    response.code = 500;
                    response.message = 'Error while checking astrolescent bridge';
                    resolve(response);
                })
        });
    },
}
