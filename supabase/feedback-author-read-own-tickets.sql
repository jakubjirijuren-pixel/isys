-- Employees may read only their own feedback tickets; existing administrator read policy remains.
drop policy if exists isys_feedback_author_read on public.isys_feedback;
create policy isys_feedback_author_read on public.isys_feedback for select to authenticated using(author_id=(select auth.uid()));
