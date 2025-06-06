'use client';

import useUploadModal from "@/hooks/useUploadModal";
import { Modal } from "../Modal";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import toast from "react-hot-toast";
import { useUser } from "@/hooks/useUser";
import uniqid from "uniqid";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";

const UploadModal = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const uploadModal = useUploadModal();
    const { user } = useUser();
    const supabaseClient = useSupabaseClient();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset
    } = useForm<FieldValues>({
        defaultValues: {
            author: '',
            title: '',
            song: null,
            image: null,
        }
    });

    const onChange = (open: boolean) => {
        if (!open) {
            reset();
            uploadModal.onClose();
        }
    };

    const onSubmit: SubmitHandler<FieldValues> = async (values) => {
        try {
            setIsLoading(true);

            const imageFile = values.image?.[0];
            const songFile = values.song?.[0];

            if (!imageFile || !songFile || !user) {
                toast.error('Missing fields');
                return;
            }

            const uniqueID = uniqid();

            const { 
                data: songData,
                error: songError,
            } = await supabaseClient.storage.from('songs').upload(
                `${user.id}/song-${values.title}-${uniqueID}`,
                songFile,
                {
                    cacheControl: '3600',
                    upsert: false,
                }
            );

            if (songError) {
                setIsLoading(false);
                return toast.error('Failed to upload song.');
            }

            const { 
                data: imageData,
                error: imageError,
            } = await supabaseClient.storage.from('images').upload(
                `${user.id}/image-${values.title}-${uniqueID}`,
                imageFile,
                {
                    cacheControl: '3600',
                    upsert: false,
                }
            );

            if (imageError) {
                setIsLoading(false);
                return toast.error('Failed to upload image.');
            }

            const {
                error: supabaseError,
            } = await supabaseClient.from('songs').insert({
                user_id: user.id,
                title: values.title,
                author: values.author,
                image_path: imageData.path,
                song_path: songData.path,
            });

            if (supabaseError) {
                setIsLoading(false);
                return toast.error(supabaseError.message);
            }

            router.refresh();
            setIsLoading(false);
            toast.success('Song created!');
            reset();
            uploadModal.onClose();
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            title="Add a song"
            description="Upload an MP3 file"
            isOpen={uploadModal.isOpen}
            onChange={onChange}
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-y-4"
            >
                <Input
                    id="title"
                    disabled={isLoading}
                    {...register('title', { required: true })}
                    placeholder="Song title"
                />
                <Input
                    id="author"
                    disabled={isLoading}
                    {...register('author', { required: true })}
                    placeholder="Song author"
                />
                <div>
                    <div className="pb-1">
                        Select a song file
                    </div>
                    <Input
                        type="file"
                        id="song"
                        accept=".mp3"
                        disabled={isLoading}
                        {...register('song', { required: true })}
                    />
                </div>
                <div>
                    <div className="pb-1">
                        Select an image
                    </div>
                    <Input
                        type="file"
                        id="image"
                        accept="image/*"
                        disabled={isLoading}
                        {...register('image', { required: true })}
                    />
                </div>
                <Button
                    type="submit"
                    className="mt-4"
                    disabled={isLoading}
                >
                    Create
                </Button>
            </form>
        </Modal>
    );
};

export { UploadModal };