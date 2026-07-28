# Reviewer Access

How to give hackathon judges a working account with real data in it, without
putting a single credential in this public repository.

## Decisions at a glance

| Question | Answer |
|---|---|
| What does the reviewer sign in as? | `owner` of **one dedicated demo organisation** |
| Is there a platform-wide admin? | No, and that is deliberate |
| Where do the credentials live? | `.env.judge`, gitignored, **never** committed |
| How does the reviewer receive them? | Submission form, or the organisers' private channel |
| Where does the sample data come from? | `scripts/seed-judge-demo.mjs` |

## Why `owner` of one organisation, not a platform admin

Impactory has no global super-admin. Authority is always scoped to a single
organisation and enforced by Row Level Security in the database rather than by
the interface — see [tenant-isolation.spec.ts](../tests/e2e/tenant-isolation.spec.ts).

Making the reviewer `owner` of a demo organisation gives them **every**
capability worth evaluating: create, edit, delete, invite members, manage the
organisation. The only thing withheld is other tenants' data, which is not
something a reviewer needs.

Minting a "platform admin" for judging would hand a stranger every
organisation's records in order to demonstrate features that organisation
ownership already covers. That trades away real security for no evaluation
benefit.

## What must not happen

This repository is public. Each of the following leaks access permanently,
because Git history retains it even after the file is deleted:

- **Do not** write the reviewer email and password into `README.md` or any
  document inside the repo.
- **Do not** set them as defaults in the e2e suite. Those tests read
  credentials from a gitignored `.env.e2e` — keep that pattern.
- **Do not** show them in the demo video or in screenshots.

If a credential is ever committed, rotating the password is not enough: any
service role key exposed alongside it must be rotated from the Supabase
Dashboard.

## Preparing the account

```bash
cp .env.judge.example .env.judge
```

Fill in `.env.judge`. For the password, generate a random one:

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

Then run the seed:

```bash
node scripts/seed-judge-demo.mjs
```

The script refuses to run if the password is shorter than 16 characters or
looks guessable, and makes no network call until those checks pass. It is safe
to re-run: the previous fixture is removed first, so the reviewer workspace is
always clean.

## Handing access to reviewers

The script finishes by printing a ready-to-paste block — URL, email, password,
and a five-minute walkthrough written for someone who has never seen the
product. Paste it into the "notes for judges" field on the submission form, or
send it through whatever private channel the organisers provide.

That output contains a password, so do not screenshot it or leave it on screen
while sharing.

Two details in the block that reviewers otherwise get wrong:

- They must choose the **Password** tab on the login page. The default is a
  passwordless magic link, which sends mail to an inbox they do not control.
- **Language.** Sidebar module names are English, so navigation needs no help.
  Action buttons inside a page are Indonesian, so the block lists the six an
  international reviewer actually has to click. The programme content is
  Indonesian on purpose — Impactory serves Indonesian civil society
  organisations and the logframe wording is tuned to how local donors read it.
  Only the public marketing pages carry an English/Indonesian toggle; the
  dashboard does not. Saying this up front stops a reviewer from reading real
  product content as an untranslated placeholder, and stops them hunting for a
  language switch that is not there.

## What reviewers will see

The seed drives `materialize_grantwriter_document`, the same RPC a real user
triggers, so the data is internally consistent rather than rows pasted into ten
tables by hand.

Sample programme: **Desa Digital Kopi Garut** — digitalising the coffee supply
chain with 300 young farmers in West Java, IDR 2.5 billion over 24 months.

The chain it produces:

1. **Grant Writer** — proposal and canonical logframe matrix
2. **LFA Builder** — goal, purpose, outcomes, outputs with their indicators
3. **WBS** — tiered work breakdown with dependencies and critical path
4. **Budget** — cost lines linked to tasks, priced against Indonesia's
   government SBM 2026 standard
5. **MEAL** — indicators with baseline, target, frequency and disaggregation

SROI deliberately stops as an unvalidated draft. There is no field data at
design stage, so any SROI ratio displayed here would be an invented number.
What is shown is the model and the inputs still required — which is the
methodological point worth evaluating.

## After judging

```bash
node scripts/seed-judge-demo.mjs --reset
```

That removes the sample data but keeps the account. To close access entirely,
delete the user from Supabase Dashboard > Authentication > Users, then delete
the demo organisation.
