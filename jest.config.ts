import type { Config } from 'jest';

const config: Config = {
	verbose: true,
	moduleFileExtensions: ['js', 'ts'],
	testEnvironment: 'node',
	preset: 'ts-jest',
	transform: {
		'^.+\\.ts?$': 'ts-jest',
	},
	moduleNameMapper: {
		'^src/(.*)$': '<rootDir>/src/$1',
	},
	transformIgnorePatterns: ['<rootDir>/node_modules/'],
};

export default config;
