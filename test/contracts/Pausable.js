require('.'); // import common test scaffolding

const { onlyGivenAddressCanInvoke, timeIsClose } = require('../utils/setupUtils');
const { currentTime, fastForward } = require('../utils/testUtils');

const Pausable = artifacts.require('Pausable');
const TestablePausable = artifacts.require('TestablePausable');

contract('Pausable', accounts => {
	const [deployerAccount, owner] = accounts;

	let instance;
	beforeEach(async () => {
		// the owner is the associated contract, so we can simulate
		instance = await Pausable.new(owner, {
			from: deployerAccount,
		});
	});
	it('is not paused by default', async () => {
		assert.equal(await instance.paused(), false);
		assert.equal(await instance.lastPauseTime(), '0');
	});
	describe('setPaused()', () => {
		it('can only be invoked by the owner', async () => {
			await onlyGivenAddressCanInvoke({
				fnc: instance.setPaused,
				args: [true],
				address: owner,
				accounts,
			});
		});
		describe('when invoked by the owner to true', () => {
			let txn;
			let timestamp;
			beforeEach(async () => {
				timestamp = await currentTime();
				txn = await instance.setPaused(true, { from: owner });
			});

			it('is it then paused', async () => {
				assert.equal(await instance.paused(), true);
			});
			it('with the current timestamp as the lastPauseTime', async () => {
				timeIsClose({ actual: await instance.lastPauseTime(), expected: timestamp });
			});

			it('and the PauseChange event is emitted', async () => {
				assert.eventEqual(txn, 'PauseChanged', [true]);
			});
			describe('when invoked by the owner to false', () => {
				let txn;
				beforeEach(async () => {
					await fastForward(100);
					txn = await instance.setPaused(false, { from: owner });
				});

				it('is it then unpaused', async () => {
					assert.equal(await instance.paused(), false);
				});

				it('and the lastPauseTime is still unchanged', async () => {
					timeIsClose({ actual: await instance.lastPauseTime(), expected: timestamp });
				});

				it('and the PauseChange event is emitted', async () => {
					assert.eventEqual(txn, 'PauseChanged', [false]);
				});
			});
		});
	});
	describe('notPaused modifier', () => {
		beforeEach(async () => {
			instance = await TestablePausable.new(owner, {
				from: deployerAccount,
			});
		});
		it('initial condition is met', async () => {
			assert.equal(await instance.someValue(), '0');
		});
		describe('when setSomeValue() is invoked', () => {
			beforeEach(async () => {
				await instance.setSomeValue('3');
			});
			it('succeeds as not paused', async () => {
				assert.equal(await instance.someValue(), '3');
			});
			describe('when paused', () => {
				beforeEach(async () => {
					await instance.setPaused(true, { from: owner });
				});
				describe('when setSomeValue() is invoked', () => {
					it('fails as the function is paused', async () => {
						await assert.revert(instance.setSomeValue('5'));
					});
				});
			});
		});
	});
});
