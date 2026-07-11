INSERT OR IGNORE INTO discussion_profiles
  (user_id, display_name, image_url, created_at, updated_at)
VALUES
  ('user_demo_mina', '민아', NULL, 1783746000000, 1783746000000),
  ('user_demo_junho', '준호', NULL, 1783746300000, 1783746300000),
  ('user_demo_sora', '소라', NULL, 1783746600000, 1783746600000);

INSERT INTO discussion_questions
  (id, scope_id, author_user_id, body, state, created_at, updated_at)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'vectors.meaning',
    'user_demo_mina',
    '벡터의 크기가 두 배가 되면 방향도 달라지나요?',
    'visible',
    1783746900000,
    1783746900000
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'vectors.meaning',
    'user_demo_junho',
    '### `np.linalg.norm` 결과를 어떻게 해석하나요?

같은 방향을 유지한 채 벡터의 크기만 **두 배**로 만들고 싶습니다.

```python
import numpy as np

v = np.array([3.0, 2.0])
scaled = 2 * v
print(np.linalg.norm(v), np.linalg.norm(scaled))
```

- 두 벡터의 방향은 같은가요?
- `norm` 값은 정확히 두 배가 되나요?',
    'visible',
    1783747800000,
    1783747800000
  )
ON CONFLICT(id) DO UPDATE SET
  body = excluded.body,
  updated_at = excluded.updated_at;

INSERT INTO discussion_answers
  (id, question_id, author_user_id, kind, body, state, created_at, updated_at)
VALUES
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'user_demo_junho',
    'community',
    '같은 양수 배를 곱하면 방향은 유지되고 크기만 달라집니다. 예제의 [3, 2]와 [6, 4]를 비교해 보세요.',
    'visible',
    1783747200000,
    1783747200000
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '11111111-1111-4111-8111-111111111111',
    'user_demo_sora',
    'community',
    '음수를 곱하면 크기는 배수만큼 커지지만 방향은 반대로 바뀐다는 점도 같이 확인하면 좋아요.',
    'visible',
    1783747500000,
    1783747500000
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    '22222222-2222-4222-8222-222222222222',
    'user_demo_sora',
    'community',
    '네. **양수 스칼라**를 곱하면 방향은 유지되고 크기만 배수만큼 커집니다.

- `scaled = 2 * v`: 각 성분과 벡터 크기가 두 배가 됩니다.
- `np.linalg.norm(scaled)`: 원래 `norm`의 두 배입니다.

```python
same_direction = np.allclose(
    scaled / np.linalg.norm(scaled),
    v / np.linalg.norm(v),
)
print(same_direction)  # True
```

단, 음수를 곱하면 크기는 절댓값만큼 변하고 **방향은 반대**가 됩니다.',
    'visible',
    1783748100000,
    1783748100000
  )
ON CONFLICT(id) DO UPDATE SET
  body = excluded.body,
  updated_at = excluded.updated_at;

INSERT OR IGNORE INTO discussion_answer_likes
  (answer_id, user_id, created_at)
VALUES
  ('33333333-3333-4333-8333-333333333333', 'user_demo_mina', 1783748400000),
  ('33333333-3333-4333-8333-333333333333', 'user_demo_sora', 1783748460000),
  ('44444444-4444-4444-8444-444444444444', 'user_demo_mina', 1783748520000),
  ('55555555-5555-4555-8555-555555555555', 'user_demo_junho', 1783748580000);
