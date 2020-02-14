const express = require('express');
const router = new express.Router();
const db = require("../db");
const ExpressError = require("../expressError")


/** GET /invoices - Get all invoices info
 * Return info on invoices: like {invoices: [{id, comp_code}, ...]}
*/

router.get('/', async function (req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, comp_code
        FROM invoices`
    );
    return res.json({ "invoices": result.rows });
  }
  catch(err) {
    return next(err);
  }
})

/** GET /invoices/[id]n - Get invoice info by id 
 * {invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}
*/

router.get('/:id', async function (req, res, next) {
  try {
    const result = await db.query(
      `SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date, c.code, c.name, c.description
        FROM invoices AS i
          JOIN companies c ON i.comp_code = c.code
       WHERE id = $1`,
       [req.params.id]
    );
    if (result.rows.length !== 0) {
      const {id, amt, paid, add_date, paid_date, code, name, description} = result.rows[0];
      const invoice = {id, amt, paid, add_date, paid_date};
      const company = {code, name, description};
   
      return res.json({ "invoice":{ ...invoice, company } });
    } else {
      throw new ExpressError("Invoice cannot be found.", 404);
    }
  }
  catch (err) {
    return next(err);
  }
})


/** POST /invoices - New invoice */
router.post('/', async function (req, res, next)  {
  try {
    const { comp_code, amt } = req.body;
    if ( !comp_code || !amt ) {
      throw new ExpressError("Incomplete input(s)", 400);
    } else {
      // check if comp_code exists in companies...
      const checkCompanyCode = await db.query(
        `SELECT code  
          FROM companies
            WHERE code = $1`,
          [comp_code]
      )
      if (checkCompanyCode.rows.length !== 0) {
        const result = await db.query(
          `INSERT INTO invoices (comp_code, amt)
            VALUES ($1, $2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt]
        );
        return res.status(201).json({ "invoice": result.rows[0] });
      } else
      throw new ExpressError("Company code not valid", 404);
    }
  }
  catch (err) {
    return next(err);
  }
})

/** PUT /invoices/[id] -  Update invoice by id */
router.put('/:id', async function (req, res, next) {
  try {
    let  { amt }  = req.body;
    console.log(amt);
    amt = parseFloat(amt);
    if (isNaN(amt)) throw new ExpressError(`Amount not a number`, 400);

    if ( !amt ) {
      throw new ExpressError("Please provide amt.")
    } else {
      const checkInvoiceExists = await db.query(
        `SELECT id  
          FROM invoices
            WHERE id = $1`,
          [req.params.id]
      )
      if (checkInvoiceExists.rows[0]) {
        const result = await db.query(
          `UPDATE invoices SET amt = $1
            WHERE id = $2
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [amt, req.params.id]
        ); 
        return res.json( { "invoice": result.rows[0] })
      }
      else {
        throw new ExpressError("Invoice cannot be found.", 404);
      }
    }
  }
  catch (err) {
    return next(err);
  }
})
/** DELETE /invoices/[id] - Delete invoice by id */
router.delete('/:id', async function (req, res, next) {
  const findInvoice = await db.query(
    `SELECT id 
      FROM invoices 
      WHERE id = $1`,
     [req.params.id]
  );
  try {
    if (findInvoice.rows.length > 0) {
      await db.query(
        `DELETE from invoices
          WHERE id = $1`,
          [req.params.id]
      );
      return res.json({ status: "deleted" });
    }
    else {
      throw new ExpressError("Invoice cannot be found", 404);
    }
  }
  catch (err) {
    return next(err);
  }
})





module.exports = router;