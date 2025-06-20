/*
  # Create avatars storage bucket and policies

  1. Changes
    - Create new storage bucket for avatars
    - Set up public read access
    - Configure user upload policies
    - Add file management policies
*/

-- Create a new storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Allow public access to read avatar files
create policy "Avatar files are publicly accessible"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatar files
create policy "Users can upload avatar files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' 
  and (storage.foldername(name))[1] = auth.uid()::text 
  and (lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'gif'))
);

-- Allow users to update their own avatar files
create policy "Users can update their own avatar files"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text )
with check (
  bucket_id = 'avatars' 
  and (storage.foldername(name))[1] = auth.uid()::text
  and (lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'gif'))
);

-- Allow users to delete their own avatar files
create policy "Users can delete their own avatar files"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );