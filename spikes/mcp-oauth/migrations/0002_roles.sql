-- The app's own table (not Better Auth's): who may read an allowance. person_id is auth_user.id (the token's `sub`).
create table roles (person_id text not null, role text not null, primary key (person_id, role));
