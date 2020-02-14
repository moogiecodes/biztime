const express = require('express');
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError")

/** Get list of companies */
router.get('/', async function (req, res, next) {
  try {

    const result = await db.query(`SELECT code, name FROM companies`);
    return res.json({ "companies": result.rows });
  }
  catch (err) {
    return next(err);
  }
})

router.get('/:code', async function (req, res, next) {
  const result = await db.query(
    `SELECT code, name, description 
    FROM companies WHERE code = $1`, 
    [req.params.code]
    );
  // is 2 error msgs what we expect?
  try {
    if (result.rows[0]) {
      const result = await db.query(
        `SELECT c.code, c.name, c.description, i.id
          FROM companies AS c
          JOIN invoices i ON c.code = i.comp_code
          WHERE code = $1`,
         [req.params.code]
      );
      const { code, name, description } = result.rows[0];
      const company = {code, name, description};
      let invoiceIds = result.rows.map(r => r.id);

      return res.json({ "company":{ ...company, invoiceIds } });
    }
    else {
      throw new ExpressError("Company given is not found.", 404);
    }
  }
  catch (err) {
    return next(err);
  }
})

router.post('/', async function (req, res, next) {

  try {
    const { code, name, description } = req.body;
    if (!code || !name || !description) {
      throw new ExpressError("Incomplete input(s).", 400);
    }
    else {
      const result = await db.query(
        `INSERT INTO companies (code, name, description) 
          VALUES ($1, $2, $3) 
          RETURNING code, name, description`, 
          [code, name, description]);

      return res.status(201).json({ "company": result.rows[0] });
    }
  }
  catch (err) {
    return next(err);
  }
})

router.put('/:code', async function (req, res, next) {

  try {

    const { name, description } = req.body;
    // if name or description not provided 
    if (!name || !description) {
      throw new ExpressError("Incomplete input(s).", 400);
    }

    const result = await db.query(
      `UPDATE companies 
        SET name = $1, description = $2 
        WHERE code = $3 RETURNING code, name, description`, 
        [name, description, req.params.code]);

    if (result.rows[0]) {
      return res.json({ "company": result.rows[0] });
    }
    // if code not in DB 
    else {
      throw new ExpressError("Company cannot be found.", 404);
    }
  }
  catch (err) {
    return next(err);
  }
})

router.delete('/:code', async function (req, res, next) {
  const findCompany = await db.query(
    `SELECT name 
      FROM companies
      WHERE code = $1`, 
      [req.params.code]
  );

  try {
    if (findCompany.rows.length !== 0) {
      await db.query(
        `DELETE from companies 
         WHERE code = $1`, 
        [req.params.code]
      );
      return res.json({ status: "deleted" });
    }
    else {
      throw new ExpressError("Company cannot be found", 404);
    }
  }
  catch (err) {
    return next(err);
  }
})


module.exports = router;