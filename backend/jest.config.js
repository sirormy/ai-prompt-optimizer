module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleFileExtensions: ['js', 'json', 'ts'],
	rootDir: 'src',
	testRegex: '.*\\.spec\\.ts$',
	transform: {
		'^.+\\.(t|j)s$': 'ts-jest',
	},
	collectCoverageFrom: [
		'**/*.(t|j)s',
	],
	coverageDirectory: '../coverage',
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
		'^@/common/(.*)$': '<rootDir>/common/$1',
		'^@/modules/(.*)$': '<rootDir>/modules/$1',
		'^@/config/(.*)$': '<rootDir>/config/$1',
	},
	setupFilesAfterEnv: [],
	testTimeout: 30000,
};
