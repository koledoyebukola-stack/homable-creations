-- Agent referral attribution: store referrer code on board at creation (e.g. ?ref=agent_ade)
-- Add one nullable column. Existing inserts without referrer_code continue to work.
ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS referrer_code TEXT NULL;

COMMENT ON COLUMN public.boards.referrer_code IS 'Agent/referrer code from URL at first touch (e.g. agent_ade), stored at board creation.';
