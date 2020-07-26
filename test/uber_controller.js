const assert = require("chai").assert;
const expect = require("chai").expect;
const fs = require("fs");
const uber_controller = require("../src/uber-controller");

const TIMEOUT = 120000;
const cookies = process.env.UBER_COOKIES
    
describe("lookup_address", () => {
  it("returns an error for wrong cookies", async function () {
    this.timeout(TIMEOUT);
    const result = await uber_controller.lookup_address("1 facEbOok WAy", '[]');
    expect(result).to.eq("Error: uber auth failed.");
  });
  it("returns a correct result for an existing address", async function () {
    this.timeout(TIMEOUT);
    const result = await uber_controller.lookup_address("1 facEbOok WAy", cookies);
    expect(result).to.have.members([ '1. 1 Facebook Way\nMenlo Park, CA, USA' ]);
  });
  it("returns numbered results", async function () {
  	this.timeout(TIMEOUT);
  	const result = await uber_controller.lookup_address("111 polk st", cookies);
  	expect(result).to.have.lengthOf.at.least(2);
  	expect(result[0]).to.match(/^1\. /);
  	expect(result[1]).to.match(/^2\. /);
  });
  it("returns an empty list for an inexistent address", async function () {
  	this.timeout(TIMEOUT);
  	const result = await uber_controller.lookup_address("kjfhkghghg", cookies);
  	expect(result).to.be.empty;
  });
});

describe("lookup_rates", () => {
  it("returns an error for wrong cookies", async function () {
    this.timeout(TIMEOUT);
    const src = {address: "1 facEbOok WAy", option: 1};
    const dest = {address: "1 infinite lOOp", option: 1};
    const result = await uber_controller.lookup_rates(src, dest, '[]');
    expect(result).to.eq("Error: uber auth failed.");
  });
  it("returns a correct result for a possible route", async function () {
    this.timeout(TIMEOUT);
    const src = {address: "1 facEbOok WAy", option: 1};
    const dest = {address: "1 infinite lOOp", option: 1};
    const result = await uber_controller.lookup_rates(src, dest, cookies);
    expect(result).to.have.lengthOf.at.least(1);
    expect(result[0]).to.match(/^1. UberX/);
  });
  it("returns an empty list for impossible routes", async function () {
    this.timeout(TIMEOUT);
    const src = {address: "1 facEbOok WAy", option: 1};
    const dest = {address: "caminito buenos aires", option: 1};
    const result = await uber_controller.lookup_rates(src, dest, cookies);
    expect(result).to.be.empty;
  });
});

describe("lookup_payment_profiles", () => {
  it("returns an error for wrong cookies", async function () {
    this.timeout(TIMEOUT);
    const src = {address: "1 facEbOok WAy", option: 1};
    const dest = {address: "1 infinite lOOp", option: 1};
    const result = await uber_controller.lookup_payment_profiles(src, dest, '[]');
    expect(result).to.eq("Error: uber auth failed.");
  });
  it("returns a correct result for a possible route", async function () {
    this.timeout(TIMEOUT);
    const src = {address: "1 facEbOok WAy", option: 1};
    const dest = {address: "1 infinite lOOp", option: 1};
    const result = await uber_controller.lookup_payment_profiles(src, dest, cookies);
    expect(result).to.have.lengthOf.at.least(1);
    expect(result[result.length - 1]).to.match(/Business|Personal/);
  });
  it("returns an empty list for impossible routes", async function () {
    this.timeout(TIMEOUT);
    const src = {address: "1 facEbOok WAy", option: 1};
    const dest = {address: "caminito buenos aires", option: 1};
    const result = await uber_controller.lookup_payment_profiles(src, dest, cookies);
    expect(result).to.be.empty;
  });
});

// describe("login_with_totp", () => {
//   it("logs in successfully", async function () {
//     this.timeout(TIMEOUT);
//     const uCredentials = require("../scripts/get_uber_credentials");
//     const credentials = await uCredentials.get_uber_credentials();
//     const result = await uber_controller.login_with_totp(credentials);
//     expect(result).not.to.eq(null);
//     try {
//         JSON.parse(result);
//     } catch (e) {
//         assert.fail("login_with_totp returns invalid json: " + result);
//     }
//   });
// });

// describe("book_trip", () => {
//   it("books a trip correctly (THIS BOOKS A REAL TRIP / DO NOT INCLUDE IN AUTOMATED TESTING)", async function () {
//     this.timeout(TIMEOUT);
//     const src = {address: "209 Edgewood Ave SE, Atlanta, GA 30303", option: 1};
//     const dest = {address: "357 Edgewood Ave SE, Atlanta, GA 30312", option: 1};
//     const result = await uber_controller.book_trip(src, dest, 2, 1, cookies);
//     console.log("result is: " + result);
//     expect(result).to.have.lengthOf(2);
//   });
// });

// describe("cancel_trip", () => {
//   it("cancels a trip correctly (THIS BOOKS A REAL TRIP / DO NOT INCLUDE IN AUTOMATED TESTING)", async function () {
//     this.timeout(TIMEOUT);
//     const src = {address: "209 Edgewood Ave SE, Atlanta, GA 30303", option: 1};
//     const dest = {address: "357 Edgewood Ave SE, Atlanta, GA 30312", option: 1};
//     const result = await uber_controller.book_trip(src, dest, 1, 1, cookies);
//     console.log(result);
//     await uber_controller.cancel_trip(cookies);
//   });
// });
