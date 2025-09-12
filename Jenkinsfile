pipeline {
  agent any
  options { timestamps() }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Docker Build & Push') {
      steps {
        script {
          def tag = env.BUILD_NUMBER
          withCredentials([usernamePassword(credentialsId: 'docker-hub',
                                           usernameVariable: 'DH_USER',
                                           passwordVariable: 'DH_PASS')]) {
            sh """
              echo "\$DH_PASS" | docker login -u "\$DH_USER" --password-stdin
              docker build -t "\$DH_USER/andhrawala:${tag}" -t "\$DH_USER/andhrawala:latest" .
              docker push "\$DH_USER/andhrawala:${tag}"
              docker push "\$DH_USER/andhrawala:latest"
            """
            env.IMAGE_REPO = "${DH_USER}/andhrawala"
            env.IMAGE_TAG  = tag
          }
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when { expression { fileExists('k8s/deployment.yml') } }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig-file', variable: 'KUBECONFIG_FILE')]) {
          sh """
            mkdir -p \$HOME/.kube
            cp \$KUBECONFIG_FILE \$HOME/.kube/config
            kubectl apply -f k8s/deployment.yml
            kubectl apply -f k8s/service.yml
            kubectl set image deployment/andhrawala andhrawala-container="${IMAGE_REPO}:${IMAGE_TAG}" --record
            kubectl rollout status deployment/andhrawala --timeout=120s
          """
        }
      }
    }
  }

  post {
    always { sh 'docker logout || true' }
    failure { echo '❌ Pipeline failed' }
    success { echo "✅ Successfully deployed ${IMAGE_REPO}:${IMAGE_TAG}" }
  }
}
