export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          changes: Json;
          created_at: string;
          entity_pk: string;
          entity_type: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          changes?: Json;
          created_at?: string;
          entity_pk: string;
          entity_type: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          changes?: Json;
          created_at?: string;
          entity_pk?: string;
          entity_type?: string;
          id?: never;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      content_revisions: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          entity_pk: string;
          entity_type: string;
          id: number;
          reason: string | null;
          snapshot: Json;
          version_no: number;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          entity_pk: string;
          entity_type: string;
          id?: never;
          reason?: string | null;
          snapshot: Json;
          version_no: number;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          entity_pk?: string;
          entity_type?: string;
          id?: never;
          reason?: string | null;
          snapshot?: Json;
          version_no?: number;
        };
        Relationships: [];
      };
      homepage_slides: {
        Row: {
          caption_override: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          photo_image_id: string;
          position: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          caption_override?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          photo_image_id: string;
          position: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          caption_override?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          photo_image_id?: string;
          position?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'homepage_slides_photo_image_id_fkey';
            columns: ['photo_image_id'];
            isOneToOne: false;
            referencedRelation: 'photo_images';
            referencedColumns: ['id'];
          }
        ];
      };
      pages: {
        Row: {
          created_at: string;
          created_by: string | null;
          css_module: string;
          deleted_at: string | null;
          html_content: string;
          id: string;
          kind: Database['public']['Enums']['page_kind'];
          nav_order: number;
          og_image_path: string | null;
          seo_description: string | null;
          seo_title: string | null;
          show_in_nav: boolean;
          slug: string;
          status: Database['public']['Enums']['publish_status'];
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          css_module?: string;
          deleted_at?: string | null;
          html_content?: string;
          id?: string;
          kind: Database['public']['Enums']['page_kind'];
          nav_order?: number;
          og_image_path?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          show_in_nav?: boolean;
          slug: string;
          status?: Database['public']['Enums']['publish_status'];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          css_module?: string;
          deleted_at?: string | null;
          html_content?: string;
          id?: string;
          kind?: Database['public']['Enums']['page_kind'];
          nav_order?: number;
          og_image_path?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          show_in_nav?: boolean;
          slug?: string;
          status?: Database['public']['Enums']['publish_status'];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      photo_categories: {
        Row: {
          category_id: string;
          created_at: string;
          created_by: string | null;
          photo_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          photo_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          photo_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_categories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_categories_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          }
        ];
      };
      photo_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          created_by: string | null;
          delivery_bytes: number | null;
          delivery_mime_type: string | null;
          delivery_storage_path: string | null;
          dimensions: string | null;
          exif: Json;
          id: string;
          is_active: boolean;
          kind: Database['public']['Enums']['asset_kind'];
          photo_id: string;
          position: number;
          source_bytes: number;
          source_mime_type: string;
          source_storage_path: string;
          thumb_crop_x: number | null;
          thumb_crop_y: number | null;
          thumb_crop_zoom: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          created_by?: string | null;
          delivery_bytes?: number | null;
          delivery_mime_type?: string | null;
          delivery_storage_path?: string | null;
          dimensions?: string | null;
          exif?: Json;
          id?: string;
          is_active?: boolean;
          kind: Database['public']['Enums']['asset_kind'];
          photo_id: string;
          position?: number;
          source_bytes: number;
          source_mime_type: string;
          source_storage_path: string;
          thumb_crop_x?: number | null;
          thumb_crop_y?: number | null;
          thumb_crop_zoom?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          created_by?: string | null;
          delivery_bytes?: number | null;
          delivery_mime_type?: string | null;
          delivery_storage_path?: string | null;
          dimensions?: string | null;
          exif?: Json;
          id?: string;
          is_active?: boolean;
          kind?: Database['public']['Enums']['asset_kind'];
          photo_id?: string;
          position?: number;
          source_bytes?: number;
          source_mime_type?: string;
          source_storage_path?: string;
          thumb_crop_x?: number | null;
          thumb_crop_y?: number | null;
          thumb_crop_zoom?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_images_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          }
        ];
      };
      photo_tags: {
        Row: {
          created_at: string;
          created_by: string | null;
          photo_id: string;
          tag_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          photo_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          photo_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_tags_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          }
        ];
      };
      photos: {
        Row: {
          admin_sort_order: number | null;
          capture_date: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          dimensions: string | null;
          id: string;
          is_searchable: boolean;
          license_text: string | null;
          og_description: string | null;
          og_image_path: string | null;
          og_title: string | null;
          search_document: string;
          search_tsv: unknown;
          slug: string;
          status: Database['public']['Enums']['publish_status'];
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          admin_sort_order?: number | null;
          capture_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          dimensions?: string | null;
          id?: string;
          is_searchable?: boolean;
          license_text?: string | null;
          og_description?: string | null;
          og_image_path?: string | null;
          og_title?: string | null;
          search_document?: string;
          search_tsv?: unknown;
          slug: string;
          status?: Database['public']['Enums']['publish_status'];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          admin_sort_order?: number | null;
          capture_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          dimensions?: string | null;
          id?: string;
          is_searchable?: boolean;
          license_text?: string | null;
          og_description?: string | null;
          og_image_path?: string | null;
          og_title?: string | null;
          search_document?: string;
          search_tsv?: unknown;
          slug?: string;
          status?: Database['public']['Enums']['publish_status'];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          role: Database['public']['Enums']['app_role'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          role?: Database['public']['Enums']['app_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          role?: Database['public']['Enums']['app_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          allow_transition_toggle: boolean;
          created_at: string;
          gallery_layout_mode: Database['public']['Enums']['layout_mode'];
          grid_desktop_default: number;
          grid_desktop_max: number;
          grid_mobile_default: number;
          grid_mobile_max: number;
          homepage_slide_duration_ms: number;
          homepage_transition_duration_ms: number;
          max_content_width_px: number | null;
          singleton_id: number;
          tailwind_palette: Json;
          theme_default: Database['public']['Enums']['theme_mode'];
          transition_preset: Database['public']['Enums']['transition_preset'];
          uniform_thumb_ratio: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          allow_transition_toggle?: boolean;
          created_at?: string;
          gallery_layout_mode?: Database['public']['Enums']['layout_mode'];
          grid_desktop_default?: number;
          grid_desktop_max?: number;
          grid_mobile_default?: number;
          grid_mobile_max?: number;
          homepage_slide_duration_ms?: number;
          homepage_transition_duration_ms?: number;
          max_content_width_px?: number | null;
          singleton_id?: number;
          tailwind_palette?: Json;
          theme_default?: Database['public']['Enums']['theme_mode'];
          transition_preset?: Database['public']['Enums']['transition_preset'];
          uniform_thumb_ratio?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          allow_transition_toggle?: boolean;
          created_at?: string;
          gallery_layout_mode?: Database['public']['Enums']['layout_mode'];
          grid_desktop_default?: number;
          grid_desktop_max?: number;
          grid_mobile_default?: number;
          grid_mobile_max?: number;
          homepage_slide_duration_ms?: number;
          homepage_transition_duration_ms?: number;
          max_content_width_px?: number | null;
          singleton_id?: number;
          tailwind_palette?: Json;
          theme_default?: Database['public']['Enums']['theme_mode'];
          transition_preset?: Database['public']['Enums']['transition_preset'];
          uniform_thumb_ratio?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cms_can_edit: { Args: Record<string, never>; Returns: boolean };
      cms_is_admin: { Args: Record<string, never>; Returns: boolean };
      insert_photo_image: {
        Args: {
          p_photo_id: string;
          p_source_path: string;
          p_source_mime: string;
          p_source_bytes: number;
          p_kind: Database['public']['Enums']['asset_kind'];
          p_position: number;
          p_alt_text?: string | null;
        };
        Returns: string;
      };
      refresh_photo_search: { Args: { p_photo_id: string }; Returns: undefined };
      save_homepage_slides: { Args: { p_slides: Json }; Returns: undefined };
      save_photo_relations: {
        Args: {
          p_photo_id: string;
          p_category_ids: string[];
          p_tag_ids: string[];
        };
        Returns: undefined;
      };
      set_lead_image: {
        Args: { p_photo_id: string; p_image_id: string };
        Returns: undefined;
      };
      show_limit: { Args: Record<string, never>; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      unaccent: { Args: { '': string }; Returns: string };
    };
    Enums: {
      app_role: 'admin' | 'editor';
      asset_kind: 'lead' | 'additional';
      layout_mode: 'uniform' | 'masonry';
      page_kind: 'home' | 'about' | 'contact' | 'custom';
      publish_status: 'published' | 'archived';
      theme_mode: 'light' | 'dark' | 'system';
      transition_preset: 'cinematic' | 'snappy' | 'experimental';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
