-- Add 'columns' to the layout_mode enum
alter type public.layout_mode
add value
if not exists 'columns';
