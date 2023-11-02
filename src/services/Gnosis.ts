// Copyright 2022-2023 @Polkasafe/polkaSafe-ui authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

// import { icpsig_backend } from "../../declarations/icpsig_backend";
import axios from 'axios';
const icpsig_backend = 'https://icp-test-api.onrender.com';

// create_vault
// transfer
// add_signatory
// remove_signatory
// approve_transaction
// reject_transaction

function generateAddressString() {
	const characters = '0123456789abcdefghijklmnopqrstuvwxyz';
	let pattern = '';

	for (let i = 0; i < 64; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		pattern += characters[randomIndex];
	}

	return pattern;
}

export class IdentityBackendService {
	createMultisig = async (owners: [string], threshold: number, name: string) => {
		try {
			const icpsigAccountConfig = {
				address: generateAddressString(),
				signatories: owners,
				name,
				threshold,
				balance: 0.0
			};
			const { data } = await axios.post(`${icpsig_backend}/multisig`, icpsigAccountConfig);
			return { data, error: null };
		} catch (error) {
			console.log('error from createMultisig', error);
			return { data: null, error };
		}
	};

	getAllMultisigByOwner = async (ownerAddress: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/multisig?q=${ownerAddress}`);
			return { data, error: null };
		} catch (error) {
			console.log('error from getAllMultisigByOwner', error);
			return { data: null, error };
		}
	};

	getAddressBookOwner = async (ownerAddress: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/addressBook?q=${ownerAddress}`);
			return { data: data?.[0] || [], error: null };
		} catch (error) {
			console.log('error from getAllMultisigByOwner', error);
			return { data: null, error };
		}
	};

	addAddressToAddressBook = async (ownerAddress: string, addressData: any): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/addressBook?q=${ownerAddress}`);
			console.log(data);
			if (data.length == 0) {
				const { data: updatedData } = await axios.post(`${icpsig_backend}/addressBook`, { address: ownerAddress, addressBook: [addressData] });
				return { data: updatedData, error: null };
			}
			const payload = data?.[0];
			payload.addressBook.push(addressData);
			const { data: updatedData } = await axios.patch(`${icpsig_backend}/addressBook/${data?.[0].id}`, payload);
			return { data: updatedData, error: null };
		} catch (error) {
			const { data: updatedData } = await axios.post(`${icpsig_backend}/addressBook`, { address: ownerAddress, addressBook: [addressData] });
			return { data: updatedData, error: null };
		}
	};

	removeAddressToAddressBook = async (ownerAddress: string, removedAddress: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/addressBook?q=${ownerAddress}`);
			const payload = data.filter((a: string) => a !== removedAddress);
			const { data: updatedData } = await axios.patch(`${icpsig_backend}/addressBook/${data.id}`, payload);
			return { data: updatedData, error: null };
		} catch (error) {
			console.log('error from getAllMultisigByOwner', error);
			return { data: null, error };
		}
	};

	getMultisigInfoByAddress = async (multisigAddress: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/multisig?q=${multisigAddress}`);
			return { data, error: null };
		} catch (error) {
			console.log('error from getMultisigInfoByAddress', error);
			return { data: null, error };
		}
	};

	approveTransaction = async (signatory: string, mutisig: string, transaction: any): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/transaction?id=${transaction}`);
			const { data: multiisgInfo } = await this.getMultisigInfoByAddress(mutisig);
			if (data.approval && multiisgInfo.threshold - 1 > data.approval.length) {
				const payload = { ...data, approval: [...data.approval, signatory] };
				const { data: updatedData } = await axios.patch(`${icpsig_backend}/transaction?id=${transaction}`, payload);
				return { data: updatedData, error: null };
			} else {
				const payload = { ...data, approval: [...data.approval, signatory], type: 'complete' };
				const { data: updatedData } = await axios.patch(`${icpsig_backend}/transaction?id=${transaction}`, payload);
				return { data: updatedData, error: null };
			}
		} catch (error) {
			console.log('error from confirmTxByHash', error);
			return { data: null, error };
		}
	};

	cancelTransaction = async (signatory: string, mutisig: string, transaction: any): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/transaction?id=${transaction}`);
			if (data.signatory === signatory) {
				const payload = { ...data, type: 'canceled' };
				const { data: updatedData } = await axios.patch(`${icpsig_backend}/transaction?id=${transaction}`, payload);
				return { data: updatedData, error: null };
			}
			return { data: null, error: 'Not Authenticated' };
		} catch (error) {
			console.log('error from confirmTxByHash', error);
			return { data: null, error };
		}
	};

	createTransferTx = async (from: string, to: string[], value: string[], signatory: string): Promise<{ data: any; error: string | null }> => {
		try {
			const val = Number(value?.[0]) || 0;
			const { data: multisig } = await this.getMultisigInfoByAddress(from);
			const multi = multisig?.[0];
			axios.patch(`${icpsig_backend}/multisig/${multi?.id}`, { balance: Number(multi.balance) - val });
		} catch (e) {
		} finally {
			try {
				const { data } = await axios.post(`${icpsig_backend}/transaction`, {
					from,
					to,
					value,
					signatory,
					category: 'transfer',
					approval: [signatory],
					data: null,
					type: 'pending'
				});
				return { data, error: null };
			} catch (error) {
				console.log(error);
				// console.log('error from createMultisigTx', error);
				return { data: null, error };
			}
		}
	};

	createAddOwnerTx = async (multisig: string, newSignatory: string, threshold: number, signatory: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.post(`${icpsig_backend}/transaction`, {
				from: multisig,
				to: null,
				value: null,
				signatory,
				category: 'addOwner',
				data: {
					newSignatory,
					threshold
				},
				approval: [signatory],
				type: 'pending'
			});
			return { data, error: null };
		} catch (error) {
			console.log(error);
			return { data: null, error };
		}
	};

	createRemoveOwnerTx = async (multisig: string, oldSignatory: string, threshold: any, signatory: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.post(`${icpsig_backend}/transaction`, {
				from: multisig,
				to: null,
				value: null,
				signatory,
				category: 'removeOwner',
				data: {
					oldSignatory,
					threshold
				},
				approval: [signatory],
				type: 'pending'
			});
			return { data, error: null };
		} catch (error) {
			console.log(error);
			return { data: null, error };
		}
	};

	getPendingTx = async (multisigAddress: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/transaction?type=pending&from=${multisigAddress}`);
			return { data, error: null };
		} catch (error) {
			console.log(error);
			return { data: null, error };
		}
	};

	getTransactionHistory = async (multisigAddress: string): Promise<{ data: any; error: string | null }> => {
		try {
			const { data } = await axios.get(`${icpsig_backend}/transaction?type=complete&from=${multisigAddress}`);
			return { data, error: null };
		} catch (error) {
			console.log(error);
			return { data: null, error };
		}
	};
}
