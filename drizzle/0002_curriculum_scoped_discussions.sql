UPDATE `discussion_questions`
SET `scope_id` = 'transformer-from-zero.' || `scope_id`
WHERE `scope_id` LIKE 'vectors.%';
