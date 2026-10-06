const repositoryBindings = new WeakMap();

export function bindSqliteCoordinationRepositoryToMain(
  repository,
  database,
) {
  // MUTATION_GUARD: frozen-repository-main-binding-attestation
  repositoryBindings.set(repository, Object.freeze({ database }));
  return repository;
}

export function assertSqliteCoordinationRepositoryMainBinding(
  repository,
  database,
) {
  const binding = repositoryBindings.get(repository);
  // MUTATION_GUARD: sealed-same-main-binding
  return binding?.database === database;
}
