-- Edit unreturned key loans: author or administrator.
drop policy if exists isys_key_loans_edit on public.key_loans;
create policy isys_key_loans_edit on public.key_loans for update to authenticated
 using (returned_at is null and (issued_by=(select auth.uid()) or public.is_isys_admin()))
 with check (returned_at is null and (issued_by=(select auth.uid()) or public.is_isys_admin()));
-- Only administrators can permanently delete records.
drop policy if exists isys_key_loans_admin_delete on public.key_loans;
create policy isys_key_loans_admin_delete on public.key_loans for delete to authenticated
 using (public.is_isys_admin());
