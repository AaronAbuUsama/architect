<!-- Generated from the blueprint. Do not edit. -->
# session

A person's signed-in session, issued by Better Auth.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| person | person.id |

## Operations

- [session.show](show.md): Who is signed in.
- [session.sign-in](sign-in.md): Sign in with email and password. The token is the bearer for every later call.
