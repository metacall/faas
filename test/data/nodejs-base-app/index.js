#!/usr/bin/env node

function isPalindrome(str) {
	const cleanedStr = String(str)
		.replace(/[^a-zA-Z0-9]/g, '')
		.toLowerCase();
	return cleanedStr === cleanedStr.split('').reverse().join('');
}

module.exports = { isPalindrome };
